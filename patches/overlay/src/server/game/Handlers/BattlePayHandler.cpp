/*
 * Copyright (C) 2008-2012 TrinityCore <http://www.trinitycore.org/>
 * LegionForge Overlay: In-Game BattlePay Shop (W button) charges Wakening Essence (1533)
 */

#include "BattlePayPackets.h"
#include "BattlePayMgr.h"
#include "BattlePayData.h"
#include "Config.h"
#include "ObjectMgr.h"
#include "ScriptMgr.h"
#include "DatabaseEnv.h"
#include "Bag.h"

namespace
{
    inline int64 GetShopPlayerBalance(Player* player)
    {
        if (!player)
            return 0;
        if (sConfigMgr->GetBoolDefault("LegionForge.BattlePay.UseWakeningEssence", true))
        {
            uint32 currencyId = sConfigMgr->GetIntDefault("LegionForge.CurrencyId", 1533);
            return int64(player->GetCurrency(currencyId));
        }
        return player->GetDonateTokens();
    }

    inline void DeductShopPlayerBalance(Player* player, uint32 price)
    {
        if (!player || price == 0)
            return;
        if (sConfigMgr->GetBoolDefault("LegionForge.BattlePay.UseWakeningEssence", true))
        {
            uint32 currencyId = sConfigMgr->GetIntDefault("LegionForge.CurrencyId", 1533);
            player->ModifyCurrency(currencyId, -int32(price));
        }
        else
        {
            player->DestroyDonateTokenCount(price / 2);
        }
    }
}

auto GetBagsFreeSlots = [](Player* player) -> uint32
{
    uint32 freeBagSlots = 0;
    for (uint8 i = INVENTORY_SLOT_BAG_START; i < INVENTORY_SLOT_BAG_END; i++)
        if (auto bag = player->GetBagByPos(i))
            freeBagSlots += bag->GetFreeSlots();

    uint8 inventoryEnd = INVENTORY_SLOT_ITEM_START + player->GetInventorySlotCount();
    for (uint8 i = INVENTORY_SLOT_ITEM_START; i < inventoryEnd; i++)
        if (!player->GetItemByPos(INVENTORY_SLOT_BAG_0, i))
            ++freeBagSlots;

    return freeBagSlots;
};

auto SendStartPurchaseResponse = [](WorldSession* session, Battlepay::Purchase const& purchase, Battlepay::Error const& result) -> void
{
    WorldPackets::BattlePay::StartPurchaseResponse response;
    response.PurchaseID = purchase.PurchaseID;
    response.ClientToken = purchase.ClientToken;
    response.PurchaseResult = result;
    session->SendPacket(response.Write());
};

auto SendPurchaseUpdate = [](WorldSession* session, Battlepay::Purchase const& purchase, uint32 result) -> void
{
    WorldPackets::BattlePay::PurchaseUpdate packet;
    WorldPackets::BattlePay::BattlePayPurchase data;
    data.PurchaseID = purchase.PurchaseID;
    data.UnkLong = 0;
    data.UnkLong2 = 0;
    data.Status = purchase.Status;
    data.ResultCode = result;
    data.ProductID = purchase.ProductID;
    data.UnkInt = purchase.ServerToken;
    data.WalletName = session->GetBattlePayMgr()->GetDefaultWalletName();
    packet.Purchase.emplace_back(data);
    session->SendPacket(packet.Write());
};

void WorldSession::HandleGetPurchaseListQuery(WorldPackets::BattlePay::GetPurchaseListQuery& /*packet*/)
{
    WorldPackets::BattlePay::PurchaseListResponse packet;
    SendPacket(packet.Write());
}

void WorldSession::HandleUpdateVasPurchaseStates(WorldPackets::BattlePay::UpdateVasPurchaseStates& /*packet*/)
{
}

void WorldSession::HandleBattlePayDistributionAssign(WorldPackets::BattlePay::DistributionAssignToTarget& packet)
{
    if (!GetBattlePayMgr()->IsAvailable())
        return;

    GetBattlePayMgr()->AssignDistributionToCharacter(packet.TargetCharacter, packet.DistributionID, packet.ProductID, packet.SpecializationID, packet.ChoiceID);
}

void WorldSession::HandleGetProductList(WorldPackets::BattlePay::GetProductList& /*packet*/)
{
    if (!GetBattlePayMgr()->IsAvailable())
        return;

    GetBattlePayMgr()->SendProductList();
    GetBattlePayMgr()->SendPointsBalance();
}

auto MakePurchase = [](ObjectGuid targetCharacter, uint32 clientToken , uint32 productID, WorldSession* session) -> void
{
    if (!session || !session->GetBattlePayMgr()->IsAvailable())
        return;

    auto mgr = session->GetBattlePayMgr();

    auto player = session->GetPlayer();
    if (!player)
        return;

    auto accountID = session->GetAccountId();

    Battlepay::Purchase purchase;
    purchase.ProductID = productID;
    purchase.ClientToken = clientToken;
    purchase.TargetCharacter = targetCharacter;
    purchase.Status = Battlepay::UpdateStatus::Loading;
    purchase.DistributionId = mgr->GenerateNewDistributionId();

    auto characterInfo = sWorld->GetCharacterInfo(targetCharacter);
    if (!characterInfo)
    {
        SendStartPurchaseResponse(session, purchase, Battlepay::Error::PurchaseDenied);
        return;
    }

    if (characterInfo->AccountId != accountID)
    {
        SendStartPurchaseResponse(session, purchase, Battlepay::Error::PurchaseDenied);
        return;
    }

    if (!sBattlePayDataStore->ProductExist(productID))
    {
        SendStartPurchaseResponse(session, purchase, Battlepay::Error::PurchaseDenied);
        return;
    }

    auto const& product = sBattlePayDataStore->GetProduct(purchase.ProductID);
    purchase.CurrentPrice = product.CurrentPriceFixedPoint;

    mgr->RegisterStartPurchase(purchase);

    auto accountBalance = GetShopPlayerBalance(player);
    auto purchaseData = mgr->GetPurchase();
    if (purchaseData->CurrentPrice > 0 && accountBalance < static_cast<int64>(purchaseData->CurrentPrice))
    {
        SendStartPurchaseResponse(session, *purchaseData, Battlepay::Error::InsufficientBalance);
        return;
    }

    if (!product.Items.empty())
    {
        if (product.Items.size() > GetBagsFreeSlots(player))
        {
            std::ostringstream data;
            data << sObjectMgr->GetTrinityString(Battlepay::String::NotEnoughFreeBagSlots, session->GetSessionDbLocaleIndex());
            player->SendCustomMessage(GetCustomMessage(Battlepay::CustomMessage::StoreBuyFailed), data);
            SendStartPurchaseResponse(session, *purchaseData, Battlepay::Error::PurchaseDenied);
            return;
        }
    }

    if (!product.ScriptName.empty())
    {
        std::string reason;
        if (!sScriptMgr->BattlePayCanBuy(session, product, reason))
        {
            std::ostringstream data;
            data << reason;
            player->SendCustomMessage(GetCustomMessage(Battlepay::CustomMessage::StoreBuyFailed), data);
            SendStartPurchaseResponse(session, *purchaseData, Battlepay::Error::PurchaseDenied);
            return;
        }
    }

    for (auto itr : product.Items)
    {
        if (mgr->AlreadyOwnProduct(itr.ItemID))
        {
            std::ostringstream data;
            data << sObjectMgr->GetTrinityString(Battlepay::String::YouAlreadyOwnThat, session->GetSessionDbLocaleIndex());
            player->SendCustomMessage(GetCustomMessage(Battlepay::CustomMessage::StoreBuyFailed), data);
            SendStartPurchaseResponse(session, *purchaseData, Battlepay::Error::PurchaseDenied);
            return;
        }
    }
    purchaseData->PurchaseID = mgr->GenerateNewPurchaseID();
    purchaseData->ServerToken = urand(0, 0xFFFFFFF);

    SendStartPurchaseResponse(session, *purchaseData, Battlepay::Error::Ok);
    SendPurchaseUpdate(session, *purchaseData, Battlepay::Error::Ok);

    WorldPackets::BattlePay::ConfirmPurchase confirmPurchase;
    confirmPurchase.PurchaseID = purchaseData->PurchaseID;
    confirmPurchase.ServerToken = purchaseData->ServerToken;
    session->SendPacket(confirmPurchase.Write());
};

void WorldSession::HandleBattlePayStartPurchase(WorldPackets::BattlePay::StartPurchase& packet)
{
    MakePurchase(packet.TargetCharacter, packet.ClientToken, packet.ProductID, this);
}

void WorldSession::HandleBattlePayPurchaseProduct(WorldPackets::BattlePay::PurchaseProduct& packet)
{
    MakePurchase(packet.TargetCharacter, packet.ClientToken, packet.ProductID, this);
}

void WorldSession::HandleBattlePayConfirmPurchase(WorldPackets::BattlePay::ConfirmPurchaseResponse& packet)
{
    if (!GetBattlePayMgr()->IsAvailable())
        return;

    packet.ClientCurrentPriceFixedPoint /= Battlepay::g_CurrencyPrecision;

    auto purchase = GetBattlePayMgr()->GetPurchase();
    if (!purchase)
        return;

    if (purchase->Lock)
    {
        SendPurchaseUpdate(this, *purchase, Battlepay::Error::PurchaseDenied);
        return;
    }

    if (purchase->ServerToken != packet.ServerToken || !packet.ConfirmPurchase || purchase->CurrentPrice != packet.ClientCurrentPriceFixedPoint)
    {
        SendPurchaseUpdate(this, *purchase, Battlepay::Error::PurchaseDenied);
        return;
    }

    auto player = GetPlayer();
    auto accountBalance = GetShopPlayerBalance(player);
    if (purchase->CurrentPrice > 0 && accountBalance < static_cast<int64>(purchase->CurrentPrice))
    {
        SendPurchaseUpdate(this, *purchase, Battlepay::Error::PurchaseDenied);
        return;
    }

    purchase->Lock = true;
    purchase->Status = Battlepay::UpdateStatus::Finish;

    auto const& product = sBattlePayDataStore->GetProduct(purchase->ProductID);
    if (!product.ScriptName.empty())
    {
        std::string reason;
        if (!sScriptMgr->BattlePayCanBuy(this, product, reason))
        {
            std::ostringstream data;
            data << reason;
            player->SendCustomMessage(GetCustomMessage(Battlepay::CustomMessage::StoreBuyFailed), data);
            SendPurchaseUpdate(this, *purchase, Battlepay::Error::PaymentFailed);
            return;
        }
    }

    if (!product.Items.empty())
    {
        if (product.Items.size() > GetBagsFreeSlots(player))
        {
            std::ostringstream data;
            data << sObjectMgr->GetTrinityString(Battlepay::String::NotEnoughFreeBagSlots, GetSessionDbLocaleIndex());
            player->SendCustomMessage(GetCustomMessage(Battlepay::CustomMessage::StoreBuyFailed), data);
            SendStartPurchaseResponse(this, *purchase, Battlepay::Error::PurchaseDenied);
            return;
        }
    }

    for (auto itr : product.Items)
    {
        if (GetBattlePayMgr()->AlreadyOwnProduct(itr.ItemID))
        {
            std::ostringstream data;
            data << sObjectMgr->GetTrinityString(Battlepay::String::YouAlreadyOwnThat, GetSessionDbLocaleIndex());
            player->SendCustomMessage(GetCustomMessage(Battlepay::CustomMessage::StoreBuyFailed), data);
            SendStartPurchaseResponse(this, *purchase, Battlepay::Error::PurchaseDenied);
            return;
        }
    }

    SendPurchaseUpdate(this, *purchase, Battlepay::Error::Other);
    uint32 initialBal = uint32(accountBalance);
    uint32 blc = initialBal >= purchase->CurrentPrice ? (initialBal - purchase->CurrentPrice) : 0;
    GetBattlePayMgr()->ProcessDelivery(purchase);
    DeductShopPlayerBalance(player, purchase->CurrentPrice);

    uint32 _nextId = 1;
    if (QueryResult result = LoginDatabase.Query("SELECT MAX(id) FROM store_purchase_history"))
    {
        uint32 Id = (*result)[0].GetUInt32();
        _nextId = Id + 1;
        LoginDatabase.PExecute("INSERT INTO `store_purchase_history` (`id`, `account`, `bnetaccountId`, `charGuid`, `charLevel`, `productId`, `balanceInitial`, `balanceEnd`, `charRace`, `charFaction`) VALUES (%u, %u, %u, %u, %u, %u, %u, %u, %u, %u);", _nextId, player->GetSession()->GetAccountId(), player->GetSession()->GetBattlenetAccountId(), player ? player->GetGUIDLow() : 0, player->getLevel(), purchase->ProductID, initialBal, blc, player->getRace(), player->getFaction());
    }
    else
    {
        LoginDatabase.PExecute("INSERT INTO `store_purchase_history` (`id`, `account`, `bnetaccountId`, `charGuid`, `charLevel`, `productId`, `balanceInitial`, `balanceEnd`, `charRace`, `charFaction`) VALUES (%u, %u, %u, %u, %u, %u, %u, %u, %u, %u);", 1, player->GetSession()->GetAccountId(), player->GetSession()->GetBattlenetAccountId(), player ? player->GetGUIDLow() : 0, player->getLevel(), purchase->ProductID, initialBal, blc, player->getRace(), player->getFaction());
    }
}

void WorldSession::HandleBattlePayAckFailedResponse(WorldPackets::BattlePay::BattlePayAckFailedResponse& /*packet*/)
{
}

void WorldSession::HandleBattlePayQueryClassTrialResult(WorldPackets::BattlePay::BattlePayQueryClassTrialResult& /*packet*/)
{
}

void WorldSession::HandleBattlePayTrialBoostCharacter(WorldPackets::BattlePay::BattlePayTrialBoostCharacter& /*packet*/)
{
}

void WorldSession::HandleBattlePayPurchaseDetailsResponse(WorldPackets::BattlePay::BattlePayPurchaseDetailsResponse& packet)
{
    WorldPackets::BattlePay::BattlePayPurchaseUnk response;
    response.UnkInt = 0;
    response.Key = "";
    response.UnkByte = packet.UnkByte;
    SendPacket(response.Write());
}

void WorldSession::HandleBattlePayPurchaseUnkResponse(WorldPackets::BattlePay::BattlePayPurchaseUnkResponse& /*packet*/)
{
    auto purchaseData = GetBattlePayMgr()->GetPurchase();
    SendPurchaseUpdate(this, *purchaseData, Battlepay::Error::Ok);
}

void WorldSession::SendDisplayPromo(int32 promotionID /*= 0*/)
{
    SendPacket(WorldPackets::BattlePay::DisplayPromotion(promotionID).Write());

    if (!GetBattlePayMgr()->IsAvailable())
        return;

    SendPacket(WorldPackets::BattlePay::BattlepayUnk(2).Write());

    auto const& product = sBattlePayDataStore->GetProduct(109);
    WorldPackets::BattlePay::DistributionListResponse packet;
    packet.Result = Battlepay::Error::Ok;

    WorldPackets::BattlePay::BattlePayDistributionObject data;
    data.DistributionID = GetBattlePayMgr()->GenerateNewDistributionId();
    data.PurchaseID = GetBattlePayMgr()->GenerateNewPurchaseID();
    data.Status = Battlepay::DistributionStatus::BATTLE_PAY_DIST_STATUS_AVAILABLE;
    data.ProductID = 109;
    data.TargetVirtualRealm = 0;
    data.TargetNativeRealm = 0;
    data.Revoked = false;

    WorldPackets::BattlePay::BattlePayProduct pProduct;
    pProduct.ProductID = product.ProductID;
    pProduct.Flags = product.Flags;
    pProduct.Type = product.Type;
    pProduct.UnkInt1 = 0;
    pProduct.DisplayId = 0;
    pProduct.ItemId = 0;
    pProduct.UnkInt4 = 0;
    pProduct.UnkInt5 = 0;
    pProduct.UnkString = "";
    pProduct.UnkBit = false;

    for (auto& itr : product.Items)
    {
        WorldPackets::BattlePay::ProductItem pItem;
        pItem.ID = itr.ID;
        pItem.ItemID = product.Items.size() > 1 ? 0 : itr.ItemID;
        pItem.Quantity = itr.Quantity;
        pItem.UnkInt1 = 0;
        pItem.UnkInt2 = 0;
        pItem.UnkByte = 0;
        pItem.HasPet = GetBattlePayMgr()->AlreadyOwnProduct(itr.ItemID);
        pItem.PetResult = itr.PetResult;

        auto dataP = GetBattlePayMgr()->WriteDisplayInfo(itr.DisplayInfoID, GetSessionDbLocaleIndex());
        if (std::get<0>(dataP))
        {
            pItem.DisplayInfo = boost::in_place();
            pItem.DisplayInfo = std::get<1>(dataP);
        }

        pProduct.Items.emplace_back(pItem);
    }

    auto dataP = GetBattlePayMgr()->WriteDisplayInfo(product.DisplayInfoID, GetSessionDbLocaleIndex());
    if (std::get<0>(dataP))
    {
        pProduct.DisplayInfo = boost::in_place();
        pProduct.DisplayInfo = std::get<1>(dataP);
    }

    data.Product = boost::in_place();
    data.Product = pProduct;

    packet.DistributionObject.emplace_back(data);

    SendPacket(packet.Write());
}

// ============================================================================
//  LegionForge — Master Custom Script Loader
//  Target: LegionCore-7.3.5V2 · Client Build 7.3.5.26124
// ============================================================================
//  Automatically registered in ScriptLoader.cpp (AddCustomScripts) via
//  patches/overlay and tools/bootstrap.ps1 during START.bat -> Prepare.
// ============================================================================

void AddSC_LegionForge_ItemTome();
void AddSC_LegionForge_ItemUpgrade();
void AddSC_LegionForge_VendorNPC();
void AddSC_LegionForge_OnlineReward();
void AddSC_LegionForge_BrokenQuests();
void AddSC_LegionForge_WorldBoss();
void AddSC_LegionForge_PlayerBots();
void AddSC_LegionForge_CatalogMods();

void AddSC_LegionForge_Custom()
{
    AddSC_LegionForge_ItemTome();
    AddSC_LegionForge_ItemUpgrade();
    AddSC_LegionForge_VendorNPC();
    AddSC_LegionForge_OnlineReward();
    AddSC_LegionForge_BrokenQuests();
    AddSC_LegionForge_WorldBoss();
    AddSC_LegionForge_PlayerBots();
    AddSC_LegionForge_CatalogMods();
}

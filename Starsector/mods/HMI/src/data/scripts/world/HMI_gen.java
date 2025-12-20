package data.scripts.world;

import com.fs.starfarer.api.Global;
import com.fs.starfarer.api.campaign.FactionAPI;
import com.fs.starfarer.api.campaign.RepLevel;
import com.fs.starfarer.api.campaign.SectorAPI;
import com.fs.starfarer.api.campaign.SectorGeneratorPlugin;
import com.fs.starfarer.api.impl.campaign.ids.Factions;
import com.fs.starfarer.api.impl.campaign.shared.SharedData;
import data.scripts.world.systems.*;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.List;

@SuppressWarnings("unchecked")
    public class HMI_gen implements SectorGeneratorPlugin {
    @Override
    public void generate(SectorAPI sector) {

        new HMI_mercy().generate(sector);
        new HMI_hazard().generate(sector);
        new HMI_obsidian().generate(sector);
        new HMI_kamikaze().generate(sector);
        new HMI_opuntia().generate(sector);
		new HMI_mansa().generate(sector);
		new HMI_manchester().generate(sector);
		new HMI_seele().generate(sector);
        new HMI_tabitha().generate(sector);
        SharedData.getData().getPersonBountyEventData().addParticipatingFaction("HMI");
//    }
//    
//        public static void initFactionRelationships(SectorAPI sector) {
        FactionAPI hmi = sector.getFaction("HMI");
        FactionAPI mess = sector.getFaction("mess");
        FactionAPI mess_remnant = sector.getFaction("mess_remnant");
        FactionAPI hmi_nightmare = sector.getFaction("hmi_nightmare");
        FactionAPI domres = sector.getFaction("hmi_nightmare");
        FactionAPI player = sector.getFaction(Factions.PLAYER);
        FactionAPI hegemony = sector.getFaction(Factions.HEGEMONY);
        FactionAPI tritachyon = sector.getFaction(Factions.TRITACHYON);
        FactionAPI pirates = sector.getFaction(Factions.PIRATES);
        FactionAPI independent = sector.getFaction(Factions.INDEPENDENT);
        FactionAPI church = sector.getFaction(Factions.LUDDIC_CHURCH);
        FactionAPI path = sector.getFaction(Factions.LUDDIC_PATH);
        FactionAPI kol = sector.getFaction(Factions.KOL);
        FactionAPI diktat = sector.getFaction(Factions.DIKTAT);
        FactionAPI persean = sector.getFaction(Factions.PERSEAN);

        hmi.setRelationship("player_npc", RepLevel.NEUTRAL);
        hmi.setRelationship(Factions.PLAYER, RepLevel.NEUTRAL);
        hmi.setRelationship(hegemony.getId(), -0.2f);
        hmi.setRelationship(tritachyon.getId(), 0.2f);
        hmi.setRelationship(pirates.getId(), -0.7f);
        hmi.setRelationship(independent.getId(), -0.4f);
        hmi.setRelationship(persean.getId(), 0.1f);
        hmi.setRelationship(church.getId(), -0.7f);
        hmi.setRelationship(path.getId(), -0.7f);
        hmi.setRelationship(kol.getId(), 0f);
        hmi.setRelationship(diktat.getId(), 0f);
        hmi.setRelationship("exigency", -0.50f);
        hmi.setRelationship("shadow_industry", -0.4f);
        hmi.setRelationship("mayorate", -0.2f);
        hmi.setRelationship("blackrock", -0.4f);
        hmi.setRelationship("tiandong", -0.4f);
        hmi.setRelationship("SCY", -0.4f);
        hmi.setRelationship("neutrinocorp", 0.1f);
        hmi.setRelationship("interstellarimperium", -0.2f);
        hmi.setRelationship("diableavionics", -0.4f);
        hmi.setRelationship("ora", -1f);

        List<FactionAPI> allFactions = sector.getAllFactions();
        for (FactionAPI curFaction : allFactions) {
            if (curFaction == mess || curFaction.isNeutralFaction()) {
                continue;
            }
            mess.setRelationship(curFaction.getId(), RepLevel.VENGEFUL);

        }

        for (FactionAPI curFaction : allFactions) {
            if (curFaction == mess_remnant || curFaction.isNeutralFaction()) {
                continue;
            }
            mess_remnant.setRelationship(curFaction.getId(), RepLevel.VENGEFUL);

        }

        for (FactionAPI curFaction : allFactions) {
            if (curFaction == hmi_nightmare || curFaction.isNeutralFaction()) {
                    continue;
            }
            hmi_nightmare.setRelationship(curFaction.getId(), RepLevel.VENGEFUL);

        }

        for (FactionAPI curFaction : allFactions) {
            if (curFaction == domres || curFaction.isNeutralFaction()) {
                continue;
            }
            domres.setRelationship(curFaction.getId(), RepLevel.VENGEFUL);

        }

    }
}


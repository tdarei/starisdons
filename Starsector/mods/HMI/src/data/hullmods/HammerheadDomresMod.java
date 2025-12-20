package data.hullmods;

import com.fs.starfarer.api.combat.BaseHullMod;
import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.combat.ShipAPI.HullSize;

public class HammerheadDomresMod extends BaseHullMod
{

    private static final float BALLISTIC_ROF_MULT = 30f;

    public void applyEffectsBeforeShipCreation(HullSize hullSize, MutableShipStatsAPI stats, String id)
    {
        stats.getBallisticRoFMult().modifyPercent(id, BALLISTIC_ROF_MULT);
    }
	
	public String getDescriptionParam(int index, HullSize hullSize) {	
		if (index == 0) return "" + (int) BALLISTIC_ROF_MULT + "%";
		return null;
	}
}

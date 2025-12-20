package data.hullmods;

import com.fs.starfarer.api.Global;
import com.fs.starfarer.api.combat.BaseHullMod;
import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.combat.ShipAPI;
import com.fs.starfarer.api.combat.ShipAPI.HullSize;
import com.fs.starfarer.api.combat.WeaponAPI;

import java.util.List;

public class HammerheadTTMod extends BaseHullMod
{

    private static final float BALLISTIC_RANGE_MULT = 450f;
    private static final float BALLISTIC_ROF_MULT = 100f;

    public void applyEffectsBeforeShipCreation(HullSize hullSize, MutableShipStatsAPI stats, String id) {
        stats.getBallisticRoFMult().modifyPercent(id, BALLISTIC_ROF_MULT);

        stats.getBallisticWeaponRangeBonus().modifyPercent(id, -100f);
        stats.getBallisticWeaponRangeBonus().modifyFlat(id, BALLISTIC_RANGE_MULT);
    }


	
	public String getDescriptionParam(int index, HullSize hullSize) {
		if (index == 0) return "" + (int) BALLISTIC_ROF_MULT + "%";		
		if (index == 1) return "" + (int) BALLISTIC_RANGE_MULT;
		return null;
	}
}

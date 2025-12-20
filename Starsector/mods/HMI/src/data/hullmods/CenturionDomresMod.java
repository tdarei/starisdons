package data.hullmods;

import com.fs.starfarer.api.combat.BaseHullMod;
import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.combat.ShipAPI.HullSize;

public class CenturionDomresMod extends BaseHullMod {

	
	public static float RANGE_BONUS = 10f;
	public static float LEADING_BONUS = 50f;
	public static float WEAPON_RECOIL_PERCENT = 75f;
	
	public void applyEffectsBeforeShipCreation(HullSize hullSize, MutableShipStatsAPI stats, String id) {
		stats.getBallisticWeaponRangeBonus().modifyPercent(id, RANGE_BONUS);
		stats.getEnergyWeaponRangeBonus().modifyPercent(id, RANGE_BONUS);
		stats.getAutofireAimAccuracy().modifyPercent(id, LEADING_BONUS);
		stats.getRecoilPerShotMult().modifyPercent(id, -WEAPON_RECOIL_PERCENT);
        stats.getRecoilDecayMult().modifyPercent(id, WEAPON_RECOIL_PERCENT);
	}
	
		public String getDescriptionParam(int index, HullSize hullSize) {
		if (index == 0) return "" + (int)Math.round(RANGE_BONUS) + "%";
		if (index == 1) return "" + (int)Math.round(LEADING_BONUS) + "%";
		if (index == 2) return "" + (int)Math.round(WEAPON_RECOIL_PERCENT) + "%";

		return null;
	}
	
}

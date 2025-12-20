package data.hullmods;

import com.fs.starfarer.api.combat.BaseHullMod;
import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.combat.ShipAPI.HullSize;

public class EagleDomresMod extends BaseHullMod {

	public static final float HEALTH_BONUS = 100f;
	public static final float REPAIR_BONUS = 75f;
	public static float WEAPON_RECOIL_PERCENT = 50f;
	
	public void applyEffectsBeforeShipCreation(HullSize hullSize, MutableShipStatsAPI stats, String id) {
		
		stats.getWeaponHealthBonus().modifyPercent(id, HEALTH_BONUS);
		stats.getCombatEngineRepairTimeMult().modifyMult(id, 1f - REPAIR_BONUS * 0.01f);
		stats.getCombatWeaponRepairTimeMult().modifyMult(id, 1f - REPAIR_BONUS * 0.01f);
		stats.getRecoilPerShotMult().modifyPercent(id, -WEAPON_RECOIL_PERCENT);
        stats.getRecoilDecayMult().modifyPercent(id, WEAPON_RECOIL_PERCENT);
	}
	
		public String getDescriptionParam(int index, HullSize hullSize) {
		if (index == 0) return "" + (int)Math.round(HEALTH_BONUS) + "%";
		if (index == 1) return "" + (int)Math.round(WEAPON_RECOIL_PERCENT) + "%";
		if (index == 2) return "" + (int)Math.round(REPAIR_BONUS) + "%";

		return null;
	}
	
}

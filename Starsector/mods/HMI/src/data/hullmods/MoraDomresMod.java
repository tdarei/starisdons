package data.hullmods;

import com.fs.starfarer.api.combat.BaseHullMod;
import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.combat.ShipAPI;
import com.fs.starfarer.api.combat.ShipAPI.HullSize;

public class MoraDomresMod extends BaseHullMod {

	
	public static final int REFIT_TIME_PLUS = 25;
	public static float SPEED_BOOST = 25f;
	public static float DAMAGE_INCREASE = 10f;

	public void applyEffectsBeforeShipCreation(HullSize hullSize, MutableShipStatsAPI stats, String id) {
		stats.getFighterRefitTimeMult().modifyPercent(id, -REFIT_TIME_PLUS);
	}

	public void applyEffectsToFighterSpawnedByShip(ShipAPI fighter, ShipAPI ship, String id) {

		MutableShipStatsAPI stats = fighter.getMutableStats();

		stats.getMaxSpeed().modifyMult(id, 1f + (SPEED_BOOST * 0.01f));

		stats.getArmorDamageTakenMult().modifyPercent(id, (-DAMAGE_INCREASE));
		stats.getShieldDamageTakenMult().modifyPercent(id, (-DAMAGE_INCREASE));
		stats.getHullDamageTakenMult().modifyPercent(id, (-DAMAGE_INCREASE));

		stats.getBallisticWeaponDamageMult().modifyPercent(id, DAMAGE_INCREASE);
		stats.getEnergyWeaponDamageMult().modifyPercent(id, DAMAGE_INCREASE);
	}

	
		public String getDescriptionParam(int index, HullSize hullSize) {
		if (index == 0) return "" + (int)Math.round(REFIT_TIME_PLUS) + "%";
		if (index == 1) return "" + (int)Math.round(DAMAGE_INCREASE) + "%";
		if (index == 2) return "" + (int)Math.round(DAMAGE_INCREASE) + "%";
		return null;
	}
	
}

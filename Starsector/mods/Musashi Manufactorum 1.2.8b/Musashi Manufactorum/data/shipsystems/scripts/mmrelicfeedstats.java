package data.shipsystems.scripts;

import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.impl.combat.BaseShipSystemScript;

public class mmrelicfeedstats extends BaseShipSystemScript {

	public static final float ROF_BONUS = 2f;
	public static final float FLUX_REDUCTION =70f;
	public static final float DAMAGE_BONUS_PERCENT = 25f;
	
	public void apply(MutableShipStatsAPI stats, String id, State state, float effectLevel) {
		
		float mult = 1f + ROF_BONUS * effectLevel;
		float bonusPercent2 = DAMAGE_BONUS_PERCENT * effectLevel;
		stats.getBallisticRoFMult().modifyMult(id, mult);
		stats.getBallisticWeaponFluxCostMod().modifyMult(id, 1f - (FLUX_REDUCTION * 0.01f));
		stats.getBallisticWeaponDamageMult().modifyPercent(id, bonusPercent2);
		
	}
	public void unapply(MutableShipStatsAPI stats, String id) {
		stats.getBallisticWeaponDamageMult().unmodify(id);
		stats.getBallisticRoFMult().unmodify(id);
		stats.getBallisticWeaponFluxCostMod().unmodify(id);
	}
	
	public StatusData getStatusData(int index, State state, float effectLevel) {
		float mult = 1f + ROF_BONUS * effectLevel;
		float bonusPercent = (int) ((mult - 1f) * 100f);
		float bonusPercent2 = DAMAGE_BONUS_PERCENT * effectLevel;
		if (index == 0) {
			return new StatusData("ballistic rate of fire +" + (int) bonusPercent + "%", false);
		}
		if (index == 1) {
			return new StatusData("ballistic flux use -" + (int) FLUX_REDUCTION + "%", false);
		}
		if (index == 2) {
			return new StatusData("+" + (int) bonusPercent2 + "% ballistic weapon damage" , false);
		}
	return null;
	}
}

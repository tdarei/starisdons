package data.hullmods;

import com.fs.starfarer.api.combat.BaseHullMod;
import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.combat.ShipAPI;
import com.fs.starfarer.api.combat.ShipAPI.HullSize;

import java.util.HashSet;
import java.util.Set;

public class HMISubliminalEncouragement extends BaseHullMod {
	
	public static final float CASUALTY_INCREASE = 4f;
	public static final float CR_BONUS = 10f;
	private static final Set<String> BLOCKED_HULLMODS = new HashSet<>();
	static
	{
		// These hullmods will automatically be removed
		BLOCKED_HULLMODS.add("hardened_subsystems");
	}
	private float check=0;
	private String id, ERROR="IncompatibleHullmodWarning";

	@Override
	public void applyEffectsAfterShipCreation(ShipAPI ship, String id){

		if (check>0) {
			check-=1;
			if (check<1){
				ship.getVariant().removeMod(ERROR);
			}
		}

		for (String tmp : BLOCKED_HULLMODS) {
			if (ship.getVariant().getHullMods().contains(tmp)) {
				ship.getVariant().removeMod(tmp);
				ship.getVariant().addMod(ERROR);
				check=3;
			}
		}
	}

	public void applyEffectsBeforeShipCreation(HullSize hullSize, MutableShipStatsAPI stats, String id) {
		stats.getMaxCombatReadiness().modifyMult(id, 1f + CR_BONUS * 0.01f);
		stats.getCRLossPerSecondPercent().modifyMult(id, CASUALTY_INCREASE);
	}
	
	public String getDescriptionParam(int index, HullSize hullSize) {
		if (index == 0) return "" + (int) CR_BONUS + "%";
		if (index == 1) return "" + (int) CASUALTY_INCREASE;
		if (index == 2) return "" + "Hardened Subsystems";
		return null;
	}
}




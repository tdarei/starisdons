package data.hullmods;

import com.fs.starfarer.api.combat.BaseHullMod;
import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.combat.ShieldAPI;
import com.fs.starfarer.api.combat.ShipAPI;
import com.fs.starfarer.api.combat.ShipAPI.HullSize;

public class HMI_StationHull extends BaseHullMod {

    public static final float SENSOR_MOD = 80f;
    public static final float MANEUVER_MALUS = -35f;
    private static final float RANGE_MULT = 0.85f;
    @Override
    public void applyEffectsBeforeShipCreation(HullSize hullSize, MutableShipStatsAPI stats, String id) {
        stats.getSensorProfile().modifyFlat(id, SENSOR_MOD);
        stats.getZeroFluxSpeedBoost().modifyPercent(id, MANEUVER_MALUS);
    }

    @Override
    public void applyEffectsAfterShipCreation(ShipAPI ship, String id){

        if (ship.getVariant().getHullMods().contains("frontshield")) {
            ship.getMutableStats().getAcceleration().modifyPercent(id, MANEUVER_MALUS * 2f);
            ship.getMutableStats().getDeceleration().modifyPercent(id, MANEUVER_MALUS);
            ship.getMutableStats().getTurnAcceleration().modifyPercent(id, MANEUVER_MALUS * 2f);
            ship.getMutableStats().getMaxTurnRate().modifyPercent(id, MANEUVER_MALUS);
            }

        if (ship.getVariant().getHullMods().contains("augmentedengines")) {
            ship.getMutableStats().getFuelUseMod().modifyMult(id, 2f);
        }

        if (ship.getVariant().getHullMods().contains("unstable_injector")) {
            ship.getMutableStats().getBallisticWeaponRangeBonus().modifyMult(id, RANGE_MULT);
            ship.getMutableStats().getEnergyWeaponRangeBonus().modifyMult(id, RANGE_MULT);
        }

    }

    @Override
    public String getDescriptionParam(int index, HullSize hullSize) {
        if (index == 0) return "" + "Makeshift Shield Generator";
        if (index == 1) return "" + "decrease manoeuvrability and zero flux speed boost by 35%";
        if (index == 2) return "" + "Augmented Drive Field";
        if (index == 3) return "" + "doubled fuel consumption";
        if (index == 4) return "" + "Unstable Injector";
        if (index == 5) return "" + (int) Math.round((1f - RANGE_MULT) * 100f) + "%";
        if (index == 6) return "" + (int)Math.round(SENSOR_MOD);
        return null;
    }
}

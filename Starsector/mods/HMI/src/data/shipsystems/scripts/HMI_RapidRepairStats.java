package data.shipsystems.scripts;

import com.fs.starfarer.api.Global;
import com.fs.starfarer.api.combat.MutableShipStatsAPI;
import com.fs.starfarer.api.combat.ShipAPI;
import com.fs.starfarer.api.impl.combat.BaseShipSystemScript;
import com.fs.starfarer.api.plugins.ShipSystemStatsScript;

public class HMI_RapidRepairStats extends BaseShipSystemScript {

    private static final String BUFF_ID = "HMI_RapidRepair";
    private float repairMult = 0;
    private float EMPMult = 0;

    @Override
    public void apply(MutableShipStatsAPI stats, String id, ShipSystemStatsScript.State state, float effectLevel) {
        stats.getCombatEngineRepairTimeMult().modifyMult(BUFF_ID, repairMult);
        stats.getCombatWeaponRepairTimeMult().modifyMult(BUFF_ID, repairMult);
        stats.getEngineDamageTakenMult().modifyFlat(BUFF_ID, EMPMult);
        stats.getWeaponDamageTakenMult().modifyFlat(BUFF_ID, EMPMult);
        stats.getEmpDamageTakenMult().modifyFlat(BUFF_ID, EMPMult);
    }
        @Override
        public void unapply (MutableShipStatsAPI stats, String id){
            stats.getCombatWeaponRepairTimeMult().unmodify(BUFF_ID);
            stats.getCombatWeaponRepairTimeMult().unmodify(BUFF_ID);
            stats.getEngineDamageTakenMult().unmodifyFlat(BUFF_ID);
            stats.getWeaponDamageTakenMult().unmodifyFlat(BUFF_ID);
            stats.getEmpDamageTakenMult().unmodifyFlat(BUFF_ID);
        }



    public void applyEffectsAfterShipCreation(ShipAPI ship, String id){

    }

}

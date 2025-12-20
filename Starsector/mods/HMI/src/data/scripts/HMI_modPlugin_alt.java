package data.scripts;

import com.fs.starfarer.api.Global;
import data.scripts.world.HMI_gen;
import exerelin.campaign.SectorManager;

import static data.scripts.HMI_modPlugin.isExerelin;

public class HMI_modPlugin_alt {
    static void initHMI() {
        if (isExerelin && !SectorManager.getCorvusMode()) {
            return;
        }
        new HMI_gen().generate(Global.getSector());
    }
}

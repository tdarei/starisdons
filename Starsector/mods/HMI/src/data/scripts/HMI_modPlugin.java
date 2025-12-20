package data.scripts;

import com.fs.starfarer.api.BaseModPlugin;
import com.fs.starfarer.api.Global;
import com.thoughtworks.xstream.XStream;
import data.campaign.fleets.MessFleetManager;
import data.scripts.world.HMI_lootmessget;
import exerelin.campaign.SectorManager;
import org.apache.log4j.Level;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

public class HMI_modPlugin extends BaseModPlugin {

    public static boolean isExerelin = false;
    public static boolean Module_HMI = true;

    public void configureXStream(XStream x) {
		x.alias("MessFleetManager", MessFleetManager.class);
        x.alias("HMI_lootmessget", HMI_lootmessget.class);
    }
    public static void syncHMIScripts() {
        if (!Global.getSector().hasScript(HMI_lootmessget.class)) {
            Global.getSector().addScript(new HMI_lootmessget());
        }
    }

    @Override
    public void onGameLoad(boolean newGame) {
            syncHMIScripts();
    }


    @Override
    public void onNewGame() {
        HMI_modPlugin_alt.initHMI();
    }
}
	


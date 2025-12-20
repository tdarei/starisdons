package data.campaign.econ.industries;

import com.fs.starfarer.api.impl.campaign.econ.impl.BaseIndustry;
import com.fs.starfarer.api.impl.campaign.ids.Commodities;

public class HMI_Fuyutsuki_Market extends BaseIndustry {
    
    @Override
    public void apply() {
        super.apply(true);

        int size = market.getSize();


        demand(Commodities.HEAVY_MACHINERY, size + 2);
        demand(Commodities.HAND_WEAPONS, size + 2);
        demand(Commodities.MARINES, size + 2);
        demand(Commodities.SUPPLIES, size + 1);
        demand(Commodities.FUEL, size + 1);
        demand(Commodities.CREW, size + 1);
        demand(Commodities.SHIPS, size );

        supply(Commodities.VOLATILES, size - 3);
        supply(Commodities.ORE, size + 2);
        supply(Commodities.RARE_ORE, size);
        supply(Commodities.ORGANICS, size - 1);
    }

    @Override
    public void unapply() {
        super.unapply();
    }

    @Override
    public boolean isAvailableToBuild() {
        return false;
    }

    @Override
    public boolean showWhenUnavailable() {
        return false;
    }
}

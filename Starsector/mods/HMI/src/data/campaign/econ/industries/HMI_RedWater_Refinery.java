package data.campaign.econ.industries;

import com.fs.starfarer.api.impl.campaign.econ.impl.BaseIndustry;
import com.fs.starfarer.api.impl.campaign.ids.Commodities;
import data.campaign.econ.HMI_items;

public class HMI_RedWater_Refinery extends BaseIndustry {

	public void apply() {
		super.apply(true);

		int size = market.getSize();

		demand(Commodities.SUPPLIES, size - 1);
		demand(Commodities.CREW, size + 1);
		demand(Commodities.HEAVY_MACHINERY, size );

		supply(HMI_items.REDWATER, size + 1);
		supply(Commodities.ORGANICS, size + 2);
		supply(Commodities.DRUGS, size + 1);
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


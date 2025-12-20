package data.campaign.econ.industries;

import com.fs.starfarer.api.impl.campaign.econ.impl.BaseIndustry;
import com.fs.starfarer.api.impl.campaign.ids.Commodities;
import data.campaign.econ.HMI_items;

public class HMI_Mess_Scavange extends BaseIndustry {

	public void apply() {
		super.apply(true);

		int size = market.getSize();

		demand(Commodities.SUPPLIES, size);
		demand(Commodities.FUEL, size);
		demand(Commodities.CREW, size - 1);
		demand(Commodities.HEAVY_MACHINERY, size - 2);

		supply(HMI_items.MESS, size + 2);
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


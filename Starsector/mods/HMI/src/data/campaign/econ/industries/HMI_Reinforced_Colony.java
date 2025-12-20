package data.campaign.econ.industries;

import com.fs.starfarer.api.Global;
import com.fs.starfarer.api.campaign.econ.MarketAPI;
import com.fs.starfarer.api.campaign.econ.MarketImmigrationModifier;
import com.fs.starfarer.api.combat.MutableStat;
import com.fs.starfarer.api.impl.campaign.econ.impl.BaseIndustry;
import com.fs.starfarer.api.impl.campaign.ids.Commodities;
import com.fs.starfarer.api.impl.campaign.ids.Factions;
import com.fs.starfarer.api.impl.campaign.ids.Submarkets;
import com.fs.starfarer.api.impl.campaign.population.PopulationComposition;
import com.fs.starfarer.api.ui.TooltipMakerAPI;
import com.fs.starfarer.api.util.Misc;
import data.campaign.econ.HMI_items;

import java.awt.*;


public class HMI_Reinforced_Colony extends BaseIndustry {
	
	protected float HAZARD_REDUCTION = -25f;
	private String hmi_id = "hmi_reinforced_condition";

	@Override
	public void apply() {
		super.apply(true);
		int size = market.getSize();

		demand(Commodities.HEAVY_MACHINERY, size-2);
		demand(Commodities.ORE, size + 1);
		if (this.isFunctional()) {
			this.market.addCondition(this.hmi_id);
		}
	}

	@Override
	public void unapply() {
		super.unapply();
		super.unapply();
		if (this.market.hasCondition(this.hmi_id)) {
			this.market.removeCondition(this.hmi_id);
		}
	}
	protected boolean hasPostDemandSection(boolean hasDemand, IndustryTooltipMode mode) {
		return mode != IndustryTooltipMode.NORMAL || this.isFunctional();
	}

	protected void addPostDemandSection(TooltipMakerAPI tooltip, boolean hasDemand, IndustryTooltipMode mode) {
		if (mode != IndustryTooltipMode.NORMAL || this.isFunctional()) {
			this.addHazardPostDemandSection(tooltip, mode);
		}

	}

	protected void addHazardPostDemandSection(TooltipMakerAPI tooltip, IndustryTooltipMode mode) {
		Color h = Misc.getHighlightColor();
		float opad = 10.0F;
		MutableStat fake = new MutableStat(0.0F);
		fake.modifyFlat("2", this.HAZARD_REDUCTION, this.getNameForModifier());
		String totalStr = "" + this.HAZARD_REDUCTION;
		float pad = 3.0F;
		tooltip.addPara("Hazard Reduction: %s", opad, h, new String[]{totalStr});
		tooltip.addStatModGrid(400.0F, 35.0F, opad, pad, fake, new TooltipMakerAPI.StatModValueGetter() {
			public String getPercentValue(MutableStat.StatMod mod) {
				return null;
			}

			public String getMultValue(MutableStat.StatMod mod) {
				return null;
			}

			public Color getModColor(MutableStat.StatMod mod) {
				return mod.value < 0.0F ? Misc.getNegativeHighlightColor() : null;
			}

			public String getFlatValue(MutableStat.StatMod mod) {
				return null;
			}
		});
	}

	public boolean isAvailableToBuild() {
		if (!Global.getSector().getPlayerFaction().knowsIndustry(getId())) {
			return false;
		}
		return market.getPlanetEntity() != null;
	}

	public boolean showWhenUnavailable() {
		return Global.getSector().getPlayerFaction().knowsIndustry(getId());
	}

	@Override
	public void advance(float amount) {
		super.advance(amount);

		if (building
				&& !isDisrupted()
				&& market.hasSubmarket(Submarkets.LOCAL_RESOURCES)
				&& market.getSubmarket(Submarkets.LOCAL_RESOURCES).getCargo().getCommodityQuantity(HMI_items.MESS) > 1) {

			float commoditiesPerDay = 100f;
			float maxQuant = (getBuildTime() - buildProgress) * commoditiesPerDay;
			float availableQuant = market.getSubmarket(Submarkets.LOCAL_RESOURCES).getCargo().getCommodityQuantity(HMI_items.MESS);
			float total = Math.min(availableQuant, maxQuant);
			market.getSubmarket(Submarkets.LOCAL_RESOURCES).getCargo().removeCommodity(HMI_items.MESS, total);

			buildProgress += Math.round(total/commoditiesPerDay);

			if (buildProgress >= buildTime) {
				finishBuildingOrUpgrading();
			}
		}
	}

}


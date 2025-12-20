package data.scripts.world.systems;

import java.awt.Color;
import java.util.Random;

import com.fs.starfarer.api.Global;
import com.fs.starfarer.api.campaign.*;
import com.fs.starfarer.api.impl.campaign.DerelictShipEntityPlugin;
import com.fs.starfarer.api.impl.campaign.ids.*;
import com.fs.starfarer.api.impl.campaign.procgen.*;
import com.fs.starfarer.api.impl.campaign.procgen.StarSystemGenerator.StarSystemType;
import com.fs.starfarer.api.impl.campaign.procgen.themes.BaseThemeGenerator;
import com.fs.starfarer.api.impl.campaign.procgen.themes.DerelictThemeGenerator;
import com.fs.starfarer.api.impl.campaign.procgen.themes.RemnantThemeGenerator;
import com.fs.starfarer.api.impl.campaign.procgen.themes.SalvageSpecialAssigner;
import com.fs.starfarer.api.impl.campaign.rulecmd.salvage.special.ShipRecoverySpecial;
import com.fs.starfarer.api.impl.campaign.terrain.BaseRingTerrain;
import com.fs.starfarer.api.impl.campaign.terrain.BaseRingTerrain.RingParams;
import com.fs.starfarer.api.impl.campaign.terrain.EventHorizonPlugin;
import com.fs.starfarer.api.impl.campaign.terrain.HyperspaceTerrainPlugin;
import com.fs.starfarer.api.impl.campaign.terrain.MagneticFieldTerrainPlugin.MagneticFieldParams;
import com.fs.starfarer.api.util.Misc;
import com.fs.starfarer.api.util.WeightedRandomPicker;
import data.campaign.procgen.DomresStationFleetManager;
import data.campaign.procgen.MessRemnStationFleetManager;

public class HMI_tabitha {
	
    public static float radius_variation = 400f;
	Random characterSaveSeed = StarSystemGenerator.random;
	Random random = new Random(characterSaveSeed.nextLong());

	public void generate(SectorAPI sector) {

		String[] strings = {"Tempestuous", "Cape Grim", "Ducie", "Point Nemo", "Suffragette"};
		int nameSelector = random.nextInt(strings.length);      // random name selector

		LocationAPI hyper = Global.getSector().getHyperspace();

		Constellation hmi_constellation_Tabitha = new Constellation(
				Constellation.ConstellationType.NORMAL, StarAge.OLD
		);

		NameGenData data = new NameGenData("null", "null");
		ProcgenUsedNames.NamePick Mansaconstname = new ProcgenUsedNames.NamePick(data, strings[nameSelector], "null");
		hmi_constellation_Tabitha.setNamePick(Mansaconstname);

		StarSystemAPI system = sector.createStarSystem("Tabitha");
		StarSystemAPI system2 = sector.createStarSystem("Alicia");

		hmi_constellation_Tabitha.getSystems().add(sector.getStarSystem("Tabitha"));
		hmi_constellation_Tabitha.getSystems().add(sector.getStarSystem("Alicia"));

		sector.getStarSystem("Tabitha").setConstellation(hmi_constellation_Tabitha);
		sector.getStarSystem("Alicia").setConstellation(hmi_constellation_Tabitha);


		system.setBackgroundTextureFilename("graphics/backgrounds/background2.jpg");

		PlanetAPI star = system.initStar("tabitha", // unique id for this star
										 StarTypes.BLUE_GIANT, // id in planets.json
										 900f,		// radius (in pixels at default zoom)
										 500); // corona radius, from star edge
		
		system.setLightColor(new Color(225, 245, 255)); // light color in entire system, affects all entities
		system.getLocation().set(46000, 50000);
		system.addTag(Tags.THEME_HIDDEN);
		system.addTag(Tags.THEME_UNSAFE);

		SectorEntityToken star_mag_field = system.addTerrain(Terrain.MAGNETIC_FIELD,
						new MagneticFieldParams(200f, // terrain effect band width 
						1200, // terrain effect middle radius
						star, // entity that it's around
						1150f, // visual band start
						1400f, // visual band end
						new Color(50, 30, 100, 30), // base color
						1f, // probability to spawn aurora sequence, checked once/day when no aurora in progress
						new Color(50, 20, 110, 130),
						new Color(150, 30, 120, 150), 
						new Color(200, 50, 130, 190),
						new Color(250, 70, 150, 240),
						new Color(200, 80, 130, 255),
						new Color(75, 0, 160), 
						new Color(127, 0, 255)
						));
			star_mag_field.setCircularOrbit(star, 0, 0, 100);
				
		
		PlanetAPI tabitha1 = system.addPlanet("hmi_chamomile", star, "Chamomile", "barren", 20, 85, 2075, 180);
		Misc.initConditionMarket(tabitha1);
        tabitha1.getMarket().addCondition(Conditions.NO_ATMOSPHERE);
		tabitha1.getMarket().addCondition(Conditions.METEOR_IMPACTS);
		tabitha1.getMarket().addCondition(Conditions.ORE_MODERATE);
		tabitha1.getMarket().addCondition(Conditions.RARE_ORE_MODERATE);
		tabitha1.getMarket().addCondition(Conditions.HOT);
		
		// Asteroid belts; which I guess we're not doing in quite proper order.

		system.addAsteroidBelt(star, 100, 2500, 256, 150, 250, Terrain.ASTEROID_BELT, null);
		system.addAsteroidBelt(star, 100, 2800, 256, 150, 250, Terrain.ASTEROID_BELT, null);
		
		system.addAsteroidBelt(star, 100, 4150, 128, 200, 300, Terrain.ASTEROID_BELT, null);
		system.addAsteroidBelt(star, 100, 4450, 188, 200, 300, Terrain.ASTEROID_BELT, null);
		system.addAsteroidBelt(star, 100, 4675, 256, 200, 300, Terrain.ASTEROID_BELT, null);
		
		system.addAsteroidBelt(star, 100, 6150, 128, 200, 300, Terrain.ASTEROID_BELT, null);
		system.addAsteroidBelt(star, 100, 6450, 188, 200, 300, Terrain.ASTEROID_BELT, null);
		system.addAsteroidBelt(star, 100, 6675, 256, 200, 300, Terrain.ASTEROID_BELT, null);
		
		system.addAsteroidBelt(star, 100, 8150, 128, 200, 300, Terrain.ASTEROID_BELT, null);
		system.addAsteroidBelt(star, 100, 8250, 188, 200, 300, Terrain.ASTEROID_BELT, null);
		system.addAsteroidBelt(star, 100, 8475, 256, 200, 300, Terrain.ASTEROID_BELT, null);
			
		system.addRingBand(star, "misc", "rings_dust0", 256f, 0, Color.white, 256f, 2400, 80f);
		system.addRingBand(star, "misc", "rings_dust0", 256f, 1, Color.white, 256f, 2700, 100f);
		
		
		system.addRingBand(star, "misc", "rings_dust0", 256f, 2, Color.white, 256f, 4200, 130f);
		system.addRingBand(star, "misc", "rings_dust0", 256f, 1, Color.white, 256f, 4500, 80f);
		
		system.addRingBand(star, "misc", "rings_dust0", 256f, 0, Color.white, 256f, 5000, 80f);
		system.addRingBand(star, "misc", "rings_dust0", 256f, 1, Color.white, 256f, 5100, 120f);
		system.addRingBand(star, "misc", "rings_dust0", 256f, 2, Color.white, 256f, 5200, 160f);
		
		system.addRingBand(star, "misc", "rings_dust0", 256f, 3, Color.white, 256f, 4300, 140f);
		system.addRingBand(star, "misc", "rings_dust0", 256f, 2, Color.white, 256f, 4400, 180f);
		system.addRingBand(star, "misc", "rings_dust0", 256f, 1, Color.white, 256f, 4500, 220f);
		
		system.addRingBand(star, "misc", "rings_ice0", 256f, 0, Color.white, 256f, 6500, 100f);
		system.addRingBand(star, "misc", "rings_ice0", 256f, 2, Color.white, 256f, 6600, 140f);
		system.addRingBand(star, "misc", "rings_ice0", 256f, 1, Color.white, 256f, 6700, 160f);
		system.addRingBand(star, "misc", "rings_ice0", 256f, 2, Color.white, 256f, 6800, 180f);
		
		system.addRingBand(star, "misc", "rings_ice0", 256f, 1, Color.white, 256f, 8200, 160f);
		system.addRingBand(star, "misc", "rings_ice0", 256f, 2, Color.white, 256f, 8400, 180f);

		SectorEntityToken ring = system.addTerrain(Terrain.RING, new RingParams(200 + 256, 2550, null, "Resin's Dress"));
		ring.setCircularOrbit(star, 0, 0, 100);
		SectorEntityToken ring2 = system.addTerrain(Terrain.RING, new RingParams(200 + 256, 4100, null, "Resin's Dress"));
		ring2.setCircularOrbit(star, 0, 0, 100);
		SectorEntityToken ring3 = system.addTerrain(Terrain.RING, new RingParams(200 + 256, 5100, null, "Resin's Dress"));
		ring3.setCircularOrbit(star, 0, 0, 100);
		SectorEntityToken ring4 = system.addTerrain(Terrain.RING, new RingParams(200 + 256, 6650, null, "Resin's Dress"));
		ring4.setCircularOrbit(star, 0, 0, 100);
		SectorEntityToken ring5 = system.addTerrain(Terrain.RING, new RingParams(200 + 256, 8300, null, "Resin's Dress"));
		ring5.setCircularOrbit(star, 0, 0, 100);

        SectorEntityToken PristineDerelictStation = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_station_pristine", Factions.DERELICT);
		PristineDerelictStation.setId("domres_guard_station_pristine_boss");

		float radius_station = 3600f + (radius_variation * (float) Math.random());
		PristineDerelictStation.setCircularOrbit(star, 60, radius_station, 36f);

		int maxFleets = 5 + this.random.nextInt(2);
		DomresStationFleetManager DomresFleets = new DomresStationFleetManager(
				PristineDerelictStation, 1.0f, 1, maxFleets, 10.0f, 10, 40);
		system.addScript(DomresFleets);


		
		ring.setCircularOrbit(star, 0, 0, 100);
		PlanetAPI tabitha2 = system.addPlanet("tabitha2", star, "Turpentine", "ice_giant", 220, 550, 19000f, 825);
		Misc.initConditionMarket(tabitha2);
		tabitha2.getMarket().addCondition(Conditions.DENSE_ATMOSPHERE);
		tabitha2.getMarket().addCondition(Conditions.HIGH_GRAVITY);
		tabitha2.getMarket().addCondition(Conditions.EXTREME_WEATHER);
		tabitha2.getMarket().addCondition(Conditions.VERY_COLD);
		tabitha2.getMarket().addCondition(Conditions.POOR_LIGHT);
		tabitha2.getMarket().addCondition(Conditions.VOLATILES_TRACE);

		PlanetAPI tabitha2a = system.addPlanet("hmi_spirit", tabitha2, "Spirit", "tundra", 230, 100, 2075, 100);
		Misc.initConditionMarket(tabitha2a);
		tabitha2a.getMarket().addCondition(Conditions.ORE_MODERATE);
		tabitha2a.getMarket().addCondition(Conditions.ORGANICS_ABUNDANT);
		tabitha2a.getMarket().addCondition(Conditions.POOR_LIGHT);
		tabitha2a.getMarket().addCondition(Conditions.COLD);
		
		PlanetAPI tabitha2b = system.addPlanet("hmi_spirit", tabitha2, "Gasoline", "cryovolcanic", 0, 100, 2850, 200);
		Misc.initConditionMarket(tabitha2b);
        tabitha2b.getMarket().addCondition(Conditions.EXTREME_WEATHER);
		tabitha2b.getMarket().addCondition(Conditions.ORE_MODERATE);
		tabitha2b.getMarket().addCondition(Conditions.RARE_ORE_RICH);
		tabitha2b.getMarket().addCondition(Conditions.VOLATILES_ABUNDANT);
		tabitha2b.getMarket().addCondition(Conditions.VERY_COLD);
		tabitha2b.getMarket().addCondition(Conditions.POOR_LIGHT);
		
		PlanetAPI tabitha2c = system.addPlanet("hmi_spirit", tabitha2, "Petroleum", "toxic_cold", 200, 100, 3450, 300);
		Misc.initConditionMarket(tabitha2c);
        tabitha2c.getMarket().addCondition(Conditions.DENSE_ATMOSPHERE);
		tabitha2c.getMarket().addCondition(Conditions.EXTREME_WEATHER);
		tabitha2c.getMarket().addCondition(Conditions.ORGANICS_PLENTIFUL);
		tabitha2c.getMarket().addCondition(Conditions.VOLATILES_TRACE);
		tabitha2c.getMarket().addCondition(Conditions.POOR_LIGHT);
		tabitha2b.getMarket().addCondition(Conditions.COLD);		
		
        SectorEntityToken tabitha_loc = system.addCustomEntity(null,null, "stable_location", Factions.NEUTRAL);
		tabitha_loc.setCircularOrbitPointingDown(star, 120, 19000, 300f);
	
		SectorEntityToken tabitha_loc2 = system.addCustomEntity(null,null, "stable_location",Factions.NEUTRAL); 
		tabitha_loc2.setCircularOrbitPointingDown(star, 240, 19000, 300f);

		SectorEntityToken tabitha_loc3 = system.addCustomEntity(null,null, "stable_location",Factions.NEUTRAL); 
		tabitha_loc3.setCircularOrbitPointingDown(star, 0, 19000, 300f);
		
		
		JumpPointAPI jumpPoint = Global.getFactory().createJumpPoint("tabitha_jump_point", "Tabitha Jump-point");
		OrbitAPI orbit = Global.getFactory().createCircularOrbit(star, 0, 5000, 360);
		jumpPoint.setOrbit(orbit);
		jumpPoint.setRelatedPlanet(tabitha2);
		jumpPoint.setStandardWormholeToHyperspaceVisual();
		system.addEntity(jumpPoint);
		
		
		float radiusAfter = StarSystemGenerator.addOrbitingEntities(system, star, StarAge.YOUNG,
				1, 2, // min/max entities to add
				11500, // radius to start adding at 
				4, // name offset - next planet will be <system name> <roman numeral of this parameter + 1>
				true); // whether to use custom or system-name based names

		system.autogenerateHyperspaceJumpPoints(true, true);

		SectorEntityToken anchor = system.getHyperspaceAnchor();
		CustomCampaignEntityAPI beacon = Global.getSector().getHyperspace().addCustomEntity("domresboss_beacon", "Domain Resurgent Claim Beacon", "HMI_DomResBoss_beacon", Factions.NEUTRAL);
		beacon.setCircularOrbitPointingDown(anchor, 100, 300, 65f);
		Color glowColor = new Color(250,155,0,255);
		Color pingColor = new Color(250,155,0,255);
		Misc.setWarningBeaconColors(beacon, glowColor, pingColor);

		cleanup(system);

///		ALICIA, SYSTEM2

		system2.setBackgroundTextureFilename("graphics/backgrounds/background2.jpg");


		PlanetAPI star2 = system2.initStar("hmi_alicia_star",
				"black_hole", // id in planets.json
				200f, 		// radius (in pixels at default zoom)
				450); // CR loss multiplier, good values are in the range of 1-5); // corona radius, from star edge

		system2.setLightColor(new Color(153, 228, 255)); // light color in entire system, affects all entities
		system2.getLocation().set(45000, 47000);

		SectorEntityToken PresterEventHorizonOuter2 = system2.addTerrain(Terrain.EVENT_HORIZON,
				new EventHorizonPlugin.CoronaParams(3000,
						2000,
						star2,
						-8f,
						0f,
						10f));


		float orbitRadius = star2.getRadius() * 8f;
		float bandWidth = 256f;
		int numBands = 12;

		for (float i = 0; i < numBands; i++) {
			float radius = orbitRadius - i * bandWidth * 0.25f - i * bandWidth * 0.1f;
			float orbitDays = radius / (30f + 10f * Misc.random.nextFloat());
			WeightedRandomPicker<String> rings = new WeightedRandomPicker<>();
			rings.add("rings_dust0");
			rings.add("rings_ice0");
			String ringhole = rings.pick();
			RingBandAPI visual = system.addRingBand(star2, "misc", ringhole, 256f, 0, Color.white, bandWidth,
					radius + bandWidth / 2f, -orbitDays);
			float spiralFactor = 2f + Misc.random.nextFloat() * 5f;
			visual.setSpiral(true);
			visual.setMinSpiralRadius(star2.getRadius());
			visual.setSpiralFactor(spiralFactor);
		}

		SectorEntityToken ringhole = system.addTerrain(Terrain.RING, new BaseRingTerrain.RingParams(orbitRadius, orbitRadius / 2f, star2, "Accretion Disk"));
		ringhole.addTag(Tags.ACCRETION_DISK);
		ringhole.setCircularOrbit(star2, 0, 0, -100);

		/*
		 * addPlanet() parameters:
		 * 1. What the planet orbits (orbit is always circular)
		 * 2. Name
		 * 3. Planet type id in planets.json
		 * 4. Starting angle in orbit, i.e. 0 = to the right of the star
		 * 5. Planet radius, pixels at default zoom
		 * 6. Orbit radius, pixels at default zoom
		 * 7. Days it takes to complete an orbit. 1 day = 10 seconds.
		 */
		/*
		 * addAsteroidBelt() parameters:
		 * 1. What the belt orbits
		 * 2. Number of asteroids
		 * 3. Orbit radius
		 * 4. Belt width
		 * 6/7. Range of days to complete one orbit. Value picked randomly for each asteroid.
		 */
		/*
		 * addRingBand() parameters:
		 * 1. What it orbits
		 * 2. Category under "graphics" in settings.json
		 * 3. Key in category
		 * 4. Width of band within the texture
		 * 5. Index of band
		 * 6. Color to apply to band
		 * 7. Width of band (in the game)
		 * 8. Orbit radius (of the middle of the band)
		 * 9. Orbital period, in days
		 */

		//JUMP POINT
		JumpPointAPI jumpPointAlicia = Global.getFactory().createJumpPoint("alicia_jumpPointA", "Alicia Inner Jump-Point");
		OrbitAPI orbitAlicia = Global.getFactory().createCircularOrbit(star2, 7000, 4000, 300);
		jumpPointAlicia.setOrbit(orbitAlicia);
		jumpPointAlicia.setStandardWormholeToHyperspaceVisual();
		system2.addEntity(jumpPointAlicia);

		system2.autogenerateHyperspaceJumpPoints(true, true);

		cleanup(system2);

	}

    void cleanup(StarSystemAPI system) {
        HyperspaceTerrainPlugin plugin = (HyperspaceTerrainPlugin) Misc.getHyperspaceTerrain().getPlugin();
        NebulaEditor editor = new NebulaEditor(plugin);
        float minRadius = plugin.getTileSize() * 2f;

        float radius = system.getMaxRadiusInHyperspace();
        editor.clearArc(system.getLocation().x, system.getLocation().y, 0, radius + minRadius * 0.5f, 0, 360f);
        editor.clearArc(system.getLocation().x, system.getLocation().y, 0, radius + minRadius, 0, 360f, 0.25f);
}
	    
		private void addDerelict(StarSystemAPI system, 
            SectorEntityToken focus, 
            String variantId, 
            ShipRecoverySpecial.ShipCondition condition,
            float orbitRadius, 
            boolean recoverable) {
        DerelictShipEntityPlugin.DerelictShipData params = new DerelictShipEntityPlugin.DerelictShipData(new ShipRecoverySpecial.PerShipData(variantId, condition), false);
        SectorEntityToken ship = BaseThemeGenerator.addSalvageEntity(system, Entities.WRECK, Factions.NEUTRAL, params);
        ship.setDiscoverable(true);

        float orbitDays = orbitRadius / (10f + (float) Math.random() * 5f);
        ship.setCircularOrbit(focus, (float) Math.random() * 360f, orbitRadius, orbitDays);

        if (recoverable) {
            SalvageSpecialAssigner.ShipRecoverySpecialCreator creator = new SalvageSpecialAssigner.ShipRecoverySpecialCreator(null, 0, 0, false, null, null);
            Misc.setSalvageSpecial(ship, creator.createSpecial(ship, null));
        }
    }

}

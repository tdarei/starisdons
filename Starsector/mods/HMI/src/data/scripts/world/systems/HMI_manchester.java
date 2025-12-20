package data.scripts.world.systems;

import com.fs.starfarer.api.Global;
import com.fs.starfarer.api.campaign.*;
import com.fs.starfarer.api.impl.campaign.DerelictShipEntityPlugin;
import com.fs.starfarer.api.impl.campaign.ids.*;
import com.fs.starfarer.api.impl.campaign.procgen.*;
import com.fs.starfarer.api.impl.campaign.procgen.themes.BaseThemeGenerator;
import com.fs.starfarer.api.impl.campaign.procgen.themes.DerelictThemeGenerator;
import com.fs.starfarer.api.impl.campaign.procgen.themes.SalvageSpecialAssigner;
import com.fs.starfarer.api.impl.campaign.rulecmd.salvage.special.ShipRecoverySpecial;
import com.fs.starfarer.api.impl.campaign.terrain.AsteroidFieldTerrainPlugin;
import com.fs.starfarer.api.impl.campaign.terrain.DebrisFieldTerrainPlugin;
import com.fs.starfarer.api.impl.campaign.terrain.HyperspaceTerrainPlugin;
import com.fs.starfarer.api.util.Misc;
import java.util.Random;

import java.awt.*;

public class HMI_manchester {

///    public static SectorEntityToken getSectorAccess() {
///       return Global.getSector().getStarSystem("Manchester").getEntityById("hmi_manchester_star");
///    }

    Random characterSaveSeed = StarSystemGenerator.random;
    Random random = new Random(characterSaveSeed.nextLong());

    public void generate(SectorAPI sector) {

        String[] strings = {"Albion", "Angle", "Britannic", "Plantagenet", "Boudica"};
        int nameSelector = random.nextInt(strings.length);      // random name selector

        LocationAPI hyper = Global.getSector().getHyperspace();

        Constellation hmi_constellation_Manchester = new Constellation(
                Constellation.ConstellationType.NORMAL, StarAge.YOUNG
        );
        NameGenData data = new NameGenData("null", "null");
        ProcgenUsedNames.NamePick Manchestserconstname = new ProcgenUsedNames.NamePick(data, strings[nameSelector], "null");
        hmi_constellation_Manchester.setNamePick(Manchestserconstname);

        StarSystemAPI system = sector.createStarSystem("Manchester");
        StarSystemAPI system2 = sector.createStarSystem("York");
        StarSystemAPI system3 = sector.createStarSystem("Essex");
        StarSystemAPI system4 = sector.createStarSystem("Exeter");

        hmi_constellation_Manchester.getSystems().add(sector.getStarSystem("Manchester"));
        hmi_constellation_Manchester.getSystems().add(sector.getStarSystem("York"));
        hmi_constellation_Manchester.getSystems().add(sector.getStarSystem("Essex"));
        hmi_constellation_Manchester.getSystems().add(sector.getStarSystem("Exeter"));

        sector.getStarSystem("Manchester").setConstellation(hmi_constellation_Manchester);
        sector.getStarSystem("York").setConstellation(hmi_constellation_Manchester);
        sector.getStarSystem("Essex").setConstellation(hmi_constellation_Manchester);
        sector.getStarSystem("Exeter").setConstellation(hmi_constellation_Manchester);


        ///MANCHESTER, SYSTEM 1///

        //Procgen system based on an arcology project that was destroyed by pirates. Comes with good salvageable ships, mixed with domain drones and pirate ships.
        //Blueprint for the ships and a hazard reduction industry hidden in ruins guarded by domain drones.

        //Sort out custom 'Defense Station', 'Defense Satelite' and Planet interactions (A la Red Shield quest) as basis to use Derelict+ fleets and give stuff to player.

        system.setBackgroundTextureFilename("graphics/backgrounds/background2.jpg");
        system.addTag("theme_hidden");
        PlanetAPI star = system.initStar("hmi_manchester_star", // unique id for this star
                StarTypes.BLUE_GIANT, // id in planets.json
                1000f,        // radius (in pixels at default zoom)
                650); // corona radius, from star edge

        system.setLightColor(new Color(225, 245, 255)); // light color in entire system, affects all entities
        system.getLocation().set(26000, 32000);



        SectorEntityToken sunguardDerelict = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_station", Factions.DERELICT);
        sunguardDerelict.setId("star_guard_station1");
        sunguardDerelict.setCircularOrbit(star, 180 + 60, 1100, 24f);

        addDerelict(system, star, "wayfarer_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 1500f,  (Math.random()<0.4));
        addDerelict(system, star, "wayfarer_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 1500f,  (Math.random()<0.4));
        addDerelict(system, star, "cerberus_d_pirates_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 1500f,  (Math.random()<0.2));
        addDerelict(system, star, "cerberus_d_pirates_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 1500f,  (Math.random()<0.2));
        addDerelict(system, star, "kite_pirates_Raider", ShipRecoverySpecial.ShipCondition.BATTERED, 1500f,  (Math.random()<0.4));
        addDerelict(system, star, "dominator_d_Assault", ShipRecoverySpecial.ShipCondition.BATTERED, 1500f,  (Math.random()<0.2));

        PlanetAPI manchester1 = system.addPlanet("manchester1", star, "Newcastle", "barren", 60, 60, 2250, 36f);
        Misc.initConditionMarket(manchester1);
        manchester1.getMarket().addCondition(Conditions.NO_ATMOSPHERE);
        manchester1.getMarket().addCondition(Conditions.EXTREME_TECTONIC_ACTIVITY);
        manchester1.getMarket().addCondition(Conditions.RARE_ORE_SPARSE);
        manchester1.getMarket().addCondition(Conditions.VERY_HOT);

        SectorEntityToken innerguardDerelictStation = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_ship", Factions.DERELICT);
        innerguardDerelictStation.setId("star_guard_station");
        innerguardDerelictStation.setCircularOrbit(manchester1, 60, 240, 36f);

        SectorEntityToken innerguardDerelict1 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_probe", Factions.DERELICT);
        innerguardDerelict1.setId("star_guard_probe1");
        innerguardDerelict1.setCircularOrbit(star, 120, 2250, 36f);

        SectorEntityToken innerguardDerelict2 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_probe", Factions.DERELICT);
        innerguardDerelict2.setId("star_guard_probe2");
        innerguardDerelict2.setCircularOrbit(star, 240, 2250, 36f);

        SectorEntityToken innerguardDerelict3 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_probe", Factions.DERELICT);
        innerguardDerelict3.setId("star_guard_probe3");
        innerguardDerelict3.setCircularOrbit(star, 0, 2250, 36f);

        PlanetAPI manchester2 = system.addPlanet("manchester2", star, "Cornwall", "toxic", 0, 95, 3800, 255f);
        Misc.initConditionMarket(manchester2);
        manchester2.getMarket().addCondition(Conditions.TOXIC_ATMOSPHERE);
        manchester2.getMarket().addCondition(Conditions.EXTREME_WEATHER);
        manchester2.getMarket().addCondition(Conditions.ORGANICS_TRACE);
        manchester2.getMarket().addCondition(Conditions.HOT);

        SectorEntityToken stationDerelict1 = DerelictThemeGenerator.addSalvageEntity(system, "domres_orbital_habitat", Factions.DERELICT);
        stationDerelict1.setId("manchester_habitat1");
        stationDerelict1.setCircularOrbit(manchester2, 100, 150, 65f);
        Misc.setDefenderOverride(stationDerelict1, new DefenderDataOverride("domres", 1f, 65, 110));

        PlanetAPI manchester3 = system.addPlanet("manchester_main", star, "Exeter", "barren-bombarded", 120, 100, 6200, 365f);
        manchester3.setCustomDescriptionId("planet_manchester");
        Misc.initConditionMarket(manchester3);
        manchester3.getMarket().addCondition(Conditions.RUINS_EXTENSIVE);
        manchester3.getMarket().addCondition(Conditions.METEOR_IMPACTS);
        manchester3.getMarket().addCondition(Conditions.HOT);
        manchester3.getMarket().addCondition(Conditions.THIN_ATMOSPHERE);
        manchester3.getMarket().addCondition(Conditions.POLLUTION);

        DebrisFieldTerrainPlugin.DebrisFieldParams params_manchester_main = new DebrisFieldTerrainPlugin.DebrisFieldParams(
                350f, // field radius - should not go above 1000 for performance reasons
                1.2f, // density, visual - affects number of debris pieces
                10000000f, // duration in days 
                0f); // days the field will keep generating glowing pieces
        params_manchester_main.source = DebrisFieldTerrainPlugin.DebrisFieldSource.MIXED;
        params_manchester_main.baseSalvageXP = 500; // base XP for scavenging in field
        SectorEntityToken debrismanchester_main1 = Misc.addDebrisField(system, params_manchester_main, StarSystemGenerator.random);
        debrismanchester_main1.setSensorProfile(1000f);
        debrismanchester_main1.setDiscoverable(true);
        debrismanchester_main1.setCircularOrbit(star, 120f, 6200, 365f);
        debrismanchester_main1.setId("manchester_main_debrisBelt");

        SectorEntityToken gate = system.addCustomEntity("manchester_gate", // unique id
                "Manchester Gate", // name - if null, defaultName from custom_entities.json will be used
                "inactive_gate", // type of object, defined in custom_entities.json
                null); // faction
        gate.setCircularOrbit(star, 60, 6200, 365);

        PlanetAPI manchester4 = system.addPlanet("manchester4", star, "Dover", "tundra", 150, 95, 8500, 500f);
        manchester4.setCustomDescriptionId("planet_dover");
        Misc.initConditionMarket(manchester4);
        manchester4.getMarket().addCondition(Conditions.EXTREME_WEATHER);
        manchester4.getMarket().addCondition(Conditions.ORGANICS_COMMON);
        manchester4.getMarket().addCondition(Conditions.FARMLAND_ADEQUATE);

        SectorEntityToken stationDerelict2 = DerelictThemeGenerator.addSalvageEntity(system, "domres_research_station", Factions.DERELICT);
        stationDerelict2.setId("manchester_derelict2");
        stationDerelict2.setCircularOrbit(manchester4, 100, 300, 65f);
        Misc.setDefenderOverride(stationDerelict2, new DefenderDataOverride("domres", 1f, 150, 300));

        SectorEntityToken devon_mirror_relay = system.addCustomEntity(
                "devon_mirror_relay",
                "Altered Mirror Shade",
                "HMI_DomRes_stellar_mirror",
                Factions.DERELICT);
        devon_mirror_relay.setDiscoverable(true);
        devon_mirror_relay.setDiscoveryXP(100f);
        devon_mirror_relay.setSensorProfile(0.15f);
        devon_mirror_relay.setCircularOrbitPointingDown(star, 330f, 7200, 500f);
        devon_mirror_relay.setCustomDescriptionId("hmi_mirror_desc");
        devon_mirror_relay.setInteractionImage("illustrations", "abandoned_station3");
        devon_mirror_relay.addTag("hmi_mirror_relaytag");
        Color glowColor = new Color(255, 234, 109,255);
        Color pingColor = new Color(250,155,0,255);
        Misc.setWarningBeaconColors(devon_mirror_relay, glowColor, pingColor);

        addDerelict(system, devon_mirror_relay, "lasher_d_CS", ShipRecoverySpecial.ShipCondition.BATTERED, 270f,  (Math.random()<0.6));
        addDerelict(system, devon_mirror_relay, "kite_pirates_Raider", ShipRecoverySpecial.ShipCondition.BATTERED, 270f,  (Math.random()<0.6));
        addDerelict(system, devon_mirror_relay, "tarsus_d_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 270f,  (Math.random()<0.6));

        system.addAsteroidBelt(star, 100, 9000, 256, 150, 170, Terrain.ASTEROID_BELT, null);
        system.addAsteroidBelt(star, 100, 9200, 256, 150, 170, Terrain.ASTEROID_BELT, null);
        system.addRingBand(star, "misc", "rings_dust0", 256f, 0, Color.white, 256f, 9100, 80f, Terrain.RING, "Ring of Lincolnshire");
        system.addRingBand(star, "misc", "rings_dust0", 512f, 1, Color.white, 256f, 9000, 80f);
        system.addRingBand(star, "misc", "rings_ice0", 256f, 1, Color.white, 256f, 9200, 80f);

        DebrisFieldTerrainPlugin.DebrisFieldParams params_ring1 = new DebrisFieldTerrainPlugin.DebrisFieldParams(
                225f, // field radius - should not go above 1000 for performance reasons
                0.7f, // density, visual - affects number of debris pieces
                10000000f, // duration in days 
                0f); // days the field will keep generating glowing pieces
        params_ring1.source = DebrisFieldTerrainPlugin.DebrisFieldSource.MIXED;
        params_ring1.baseSalvageXP = 500; // base XP for scavenging in field
        SectorEntityToken debrismanchester_ring1 = Misc.addDebrisField(system, params_ring1, StarSystemGenerator.random);
        debrismanchester_ring1.setSensorProfile(1000f);
        debrismanchester_ring1.setDiscoverable(true);
        debrismanchester_ring1.setCircularOrbit(star, 30f, 9000, 160f);
        debrismanchester_ring1.setId("manchester_main_debrisBelt");

        SectorEntityToken manchester_relay = system.addCustomEntity("manchester_nav_buoy", // unique id
                "Manchester Nav Buoy", // name - if null, defaultName from custom_entities.json will be used
                "nav_buoy", // type of object, defined in custom_entities.json
                Factions.NEUTRAL); // faction
        manchester_relay.setCircularOrbitPointingDown(star, 30f, 9000, 160f);

        DebrisFieldTerrainPlugin.DebrisFieldParams params_ring2 = new DebrisFieldTerrainPlugin.DebrisFieldParams(
                200f, // field radius - should not go above 1000 for performance reasons
                0.8f, // density, visual - affects number of debris pieces
                10000000f, // duration in days 
                0f); // days the field will keep generating glowing pieces
        params_ring2.source = DebrisFieldTerrainPlugin.DebrisFieldSource.MIXED;
        params_ring2.baseSalvageXP = 500; // base XP for scavenging in field
        SectorEntityToken debrismanchester_ring2 = Misc.addDebrisField(system, params_ring2, StarSystemGenerator.random);
        debrismanchester_ring2.setSensorProfile(1000f);
        debrismanchester_ring2.setDiscoverable(true);
        debrismanchester_ring2.setCircularOrbit(star, 210f, 9000, 160f);
        debrismanchester_ring2.setId("manchester_main_debrisBelt");

        SectorEntityToken manchester_loc = system.addCustomEntity(null, null, "stable_location", Factions.NEUTRAL);
        manchester_loc.setCircularOrbitPointingDown(star, 210f, 9000, 500f);

        SectorEntityToken manchester_loc_relay = system.addCustomEntity(
                "manchester_reconned_relay",
                "Reconstructed Relay",
                "hmi_recon_comm_relay",
                Factions.DERELICT);
        manchester_loc_relay.setDiscoverable(true);
        manchester_loc_relay.setDiscoveryXP(100f);
        manchester_loc_relay.setSensorProfile(0.15f);
        manchester_loc_relay.setCircularOrbitPointingDown(star, 208f, 9000, 500f);
        manchester_loc_relay.setCustomDescriptionId("hmi_recon_relay_desc");
        manchester_loc_relay.setInteractionImage("illustrations", "abandoned_station3");
        manchester_loc_relay.addTag("hmi_recon_comm_relaytag");
        Color glowColor1 = new Color(255, 234, 109,255);
        Color pingColor1 = new Color(250,155,0,255);
        Misc.setWarningBeaconColors(manchester_loc_relay, glowColor1, pingColor1);

        addDerelict(system, manchester_loc_relay, "buffalo2_FS", ShipRecoverySpecial.ShipCondition.BATTERED, 2700f,  (Math.random()<0.4));
        addDerelict(system, manchester_loc_relay, "colossus3_Pirate", ShipRecoverySpecial.ShipCondition.BATTERED, 330f,  (Math.random()<0.4));
        addDerelict(system, manchester_loc_relay, "shepherd_Frontier", ShipRecoverySpecial.ShipCondition.BATTERED, 320f,  (Math.random()<0.6));
        addDerelict(system, manchester_loc_relay, "cerberus_d_pirates_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 270f,  (Math.random()<0.6));
        addDerelict(system, manchester_loc_relay, "kite_pirates_Raider", ShipRecoverySpecial.ShipCondition.BATTERED, 280f,  (Math.random()<0.4));
        addDerelict(system, manchester_loc_relay, "hound_d_pirates_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 300f,  (Math.random()<0.4));
        addDerelict(system, manchester_loc_relay, "domres_defender_armoured", ShipRecoverySpecial.ShipCondition.BATTERED, 270f,  false);
        addDerelict(system, manchester_loc_relay, "domres_rampart_attack", ShipRecoverySpecial.ShipCondition.BATTERED, 160f,  false);
        addDerelict(system, manchester_loc_relay, "domres_bastillon_attack", ShipRecoverySpecial.ShipCondition.BATTERED, 180f,  false);
        addDerelict(system, manchester_loc_relay, "domres_bastillon_attack", ShipRecoverySpecial.ShipCondition.BATTERED, 170f,  true);

        SectorEntityToken innerguardDerelictLoc = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_ship", Factions.DERELICT);
        innerguardDerelictLoc.setId("star_guard_sat1");
        innerguardDerelictLoc.setCircularOrbit(star, 60f, 9000, 160f);

        SectorEntityToken innerguardDerelictRoid = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_station", Factions.DERELICT);
        innerguardDerelictRoid.setId("star_guard_station2");
        innerguardDerelictRoid.setCircularOrbit(star, 140f, 9000, 160f);


        PlanetAPI manchester5 = system.addPlanet("manchester5", star, "Devon", "gas_giant", 230, 275, 13500, 450);
        manchester5.getSpec().setPlanetColor(new Color(150, 245, 255, 255));
        manchester5.getSpec().setGlowTexture(Global.getSettings().getSpriteName("hab_glows", "banded"));
        manchester5.getSpec().setGlowColor(new Color(250, 225, 55, 64));
        manchester5.getSpec().setUseReverseLightForGlow(true);
        manchester5.applySpecChanges();
        Misc.initConditionMarket(manchester5);
        manchester5.getMarket().addCondition(Conditions.EXTREME_WEATHER);
        manchester5.getMarket().addCondition(Conditions.HIGH_GRAVITY);
        manchester5.getMarket().addCondition(Conditions.VOLATILES_ABUNDANT);
        manchester5.getMarket().addCondition(Conditions.COLD);
        manchester5.getMarket().addCondition(Conditions.DARK);

        PlanetAPI manchester5a = system.addPlanet("manchester5a", manchester5, "Hermedon", "lava_minor", 0, 65, 500, 250);
        Misc.initConditionMarket(manchester5a);
        manchester5a.getMarket().addCondition(Conditions.TOXIC_ATMOSPHERE);
        manchester5a.getMarket().addCondition(Conditions.EXTREME_TECTONIC_ACTIVITY);
        manchester5a.getMarket().addCondition(Conditions.RARE_ORE_ULTRARICH);
        manchester5a.getMarket().addCondition(Conditions.VERY_HOT);
        manchester5a.getMarket().addCondition(Conditions.DARK);
        manchester5a.getMarket().addCondition(Conditions.HIGH_GRAVITY);

        PlanetAPI manchester5b = system.addPlanet("manchester5b", manchester5, "Coalbrookedale", "barren-bombarded", 0, 45, 1200, 350);
        Misc.initConditionMarket(manchester5b);
        manchester5b.getMarket().addCondition(Conditions.THIN_ATMOSPHERE);
        manchester5b.getMarket().addCondition(Conditions.METEOR_IMPACTS);
        manchester5b.getMarket().addCondition(Conditions.TECTONIC_ACTIVITY);
        manchester5b.getMarket().addCondition(Conditions.RARE_ORE_MODERATE);
        manchester5b.getMarket().addCondition(Conditions.ORE_MODERATE);
        manchester5b.getMarket().addCondition(Conditions.VOLATILES_TRACE);
        manchester5b.getMarket().addCondition(Conditions.ORGANICS_TRACE);
        manchester5b.getMarket().addCondition(Conditions.COLD);
        manchester5b.getMarket().addCondition(Conditions.DARK);

        system.addAsteroidBelt(manchester5, 100, 1500, 256, 150, 250, Terrain.ASTEROID_BELT, null);
        system.addRingBand(manchester5, "misc", "rings_dust0", 256f, 0, Color.white, 256f, 1500, 80f);

        PlanetAPI manchester5c = system.addPlanet("manchester5c", manchester5, "Northumberland", "rocky_metallic", 0, 35, 2100, 250f);
        Misc.initConditionMarket(manchester5c);
        manchester5c.getMarket().addCondition(Conditions.NO_ATMOSPHERE);
        manchester5c.getMarket().addCondition(Conditions.ORE_RICH);
        manchester5c.getMarket().addCondition(Conditions.RARE_ORE_RICH);
        manchester5c.getMarket().addCondition(Conditions.VERY_COLD);
        manchester5c.getMarket().addCondition(Conditions.DARK);
        manchester5c.getMarket().addCondition(Conditions.LOW_GRAVITY);

        SectorEntityToken stationDerelict3 = DerelictThemeGenerator.addSalvageEntity(system, "domres_mining_station", Factions.DERELICT);
        stationDerelict3.setId("manchester_derelict4");
        stationDerelict3.setCircularOrbit(manchester5, 100, 1500, 65f);
        stationDerelict3.setCustomDescriptionId("domres_station_mining");
        Misc.setDefenderOverride(stationDerelict3, new DefenderDataOverride("domres", 1f, 50, 100));

        DebrisFieldTerrainPlugin.DebrisFieldParams params_devon1 = new DebrisFieldTerrainPlugin.DebrisFieldParams(
                100f, // field radius - should not go above 1000 for performance reasons
                1.5f, // density, visual - affects number of debris pieces
                10000000f, // duration in days 
                0f); // days the field will keep generating glowing pieces
        params_devon1.source = DebrisFieldTerrainPlugin.DebrisFieldSource.MIXED;
        params_devon1.baseSalvageXP = 500; // base XP for scavenging in field
        SectorEntityToken debrismanchester_devon1 = Misc.addDebrisField(system, params_devon1, StarSystemGenerator.random);
        debrismanchester_devon1.setSensorProfile(1000f);
        debrismanchester_devon1.setDiscoverable(true);
        debrismanchester_devon1.setCircularOrbit(manchester5, 100, 1500, 65f);
        debrismanchester_devon1.setId("devon_debrisBelt1");

        SectorEntityToken manchester5L4 = system.addTerrain(Terrain.ASTEROID_FIELD,
                new AsteroidFieldTerrainPlugin.AsteroidFieldParams(
                        400f, // min radius
                        600f, // max radius
                        20, // min asteroid count
                        30, // max asteroid count
                        4f, // min asteroid radius
                        16f, // max asteroid radius
                        "Devon L4 Asteroids")); // null for default name

        SectorEntityToken manchester5L5 = system.addTerrain(Terrain.ASTEROID_FIELD,
                new AsteroidFieldTerrainPlugin.AsteroidFieldParams(
                        400f, // min radius
                        600f, // max radius
                        20, // min asteroid count
                        30, // max asteroid count
                        4f, // min asteroid radius
                        16f, // max asteroid radius
                        "Devon L5 Asteroids")); // null for default name

        manchester5L4.setCircularOrbit(star, 230 + 60, 13500, 450);
        manchester5L5.setCircularOrbit(star, 230 - 60, 13500, 450);

        SectorEntityToken innerguardDerelict5L4 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_ship", Factions.DERELICT);
        innerguardDerelict5L4.setId("star_guard_sat2");
        innerguardDerelict5L4.setCircularOrbit(star, 290, 13500, 450);

        SectorEntityToken innerguardDerelict5L5 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_ship", Factions.DERELICT);
        innerguardDerelict5L5.setId("star_guard_sat3");
        innerguardDerelict5L5.setCircularOrbit(star, 170, 13500, 450);

        SectorEntityToken innerguardDerelict5L2 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_station", Factions.DERELICT);
        innerguardDerelict5L2.setId("star_guard_station3");
        innerguardDerelict5L2.setCircularOrbit(star, 50, 13500, 450);

        addDerelict(system, innerguardDerelict5L2, "brawler_Assault", ShipRecoverySpecial.ShipCondition.BATTERED, 220f,  (Math.random()<0.4));
        addDerelict(system, innerguardDerelict5L2, "kite_pirates_Raider", ShipRecoverySpecial.ShipCondition.BATTERED, 200f,  (Math.random()<0.4));
        addDerelict(system, innerguardDerelict5L2, "condor_Attack", ShipRecoverySpecial.ShipCondition.BATTERED, 220f,  (Math.random()<0.2));
        addDerelict(system, innerguardDerelict5L2, "cerberus_d_pirates_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 200f,  (Math.random()<0.2));
        addDerelict(system, innerguardDerelict5L2, "kite_pirates_Raider", ShipRecoverySpecial.ShipCondition.BATTERED, 190f,  (Math.random()<0.4));
        addDerelict(system, innerguardDerelict5L2, "mudskipper_Standard", ShipRecoverySpecial.ShipCondition.BATTERED, 200f,  (Math.random()<0.2));


        JumpPointAPI jumpPoint = Global.getFactory().createJumpPoint("manchester_outer_point", "Manchester Jump-point");
        OrbitAPI orbit = Global.getFactory().createCircularOrbit(star, 170, 9500, 450);
        jumpPoint.setOrbit(orbit);
        jumpPoint.setRelatedPlanet(manchester5);
        jumpPoint.setStandardWormholeToHyperspaceVisual();
        system.addEntity(jumpPoint);


        SectorEntityToken stationDerelict4 = system.addCustomEntity(
                "stationDerelict4",
                "Border Crossing",
                "station_side06",
                Factions.NEUTRAL);
        stationDerelict4.setDiscoverable(true);
        stationDerelict4.setDiscoveryXP(50f);
        stationDerelict4.setSensorProfile(0.25f);
        stationDerelict4.setCircularOrbit(jumpPoint, 100, 200, 65f);
        stationDerelict4.setCustomDescriptionId("domres_station_jump");
        stationDerelict4.setInteractionImage("illustrations", "abandoned_station3");
        stationDerelict4.addTag("hmi_domres_station_jump");
        stationDerelict4.getMemoryWithoutUpdate().set("$abandonedStation", true);
        Misc.setAbandonedStationMarket("manchester_abandoned_station_market", stationDerelict4);

        SectorEntityToken guardDerelict1 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_probe", Factions.DERELICT);
        guardDerelict1.setId("jump_guard_probe1");
        guardDerelict1.setCircularOrbit(jumpPoint, 0, 400, 180f);

        SectorEntityToken guardDerelict2 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_probe", Factions.DERELICT);
        guardDerelict2.setId("jump_guard_probe2");
        guardDerelict2.setCircularOrbit(jumpPoint, 120, 400, 180f);

        SectorEntityToken guardDerelict3 = DerelictThemeGenerator.addSalvageEntity(system, "domres_guard_probe", Factions.DERELICT);
        guardDerelict3.setId("jump_guard_probe3");
        guardDerelict3.setCircularOrbit(jumpPoint, 240, 400, 180f);


        DebrisFieldTerrainPlugin.DebrisFieldParams params_manchester_outer = new DebrisFieldTerrainPlugin.DebrisFieldParams(
                500f, // field radius - should not go above 1000 for performance reasons
                0.6f, // density, visual - affects number of debris pieces
                10000000f, // duration in days 
                0f); // days the field will keep generating glowing pieces
        params_manchester_outer.source = DebrisFieldTerrainPlugin.DebrisFieldSource.MIXED;
        params_manchester_outer.baseSalvageXP = 500; // base XP for scavenging in field
        SectorEntityToken debrismanchester_outer = Misc.addDebrisField(system, params_manchester_outer, StarSystemGenerator.random);
        debrismanchester_outer.setSensorProfile(1000f);
        debrismanchester_outer.setDiscoverable(true);
        debrismanchester_outer.setCircularOrbit(star, 230 - 60, 13500, 450);
        debrismanchester_outer.setId("debrismanchester_outer");

        system.autogenerateHyperspaceJumpPoints(true, true);

        SectorEntityToken anchor = system.getHyperspaceAnchor();
        CustomCampaignEntityAPI beacon = Global.getSector().getHyperspace().addCustomEntity("domres_beacon", "Damaged Beacon", "HMI_DomRes_beacon", Factions.NEUTRAL);
        beacon.setCircularOrbitPointingDown(anchor, 100, 300, 65f);
        Color glowColor2 = new Color(250,155,0,255);
        Color pingColor2 = new Color(250,155,0,255);
        Misc.setWarningBeaconColors(beacon, glowColor2, pingColor2);

        cleanup(system);


        ///YORK, SYSTEM 2///


        //StarSystemAPI system2 = sector.createStarSystem("York");
        system2.setBackgroundTextureFilename("graphics/backgrounds/background_galatia.jpg");

        // create the star and generate the hyperspace anchor for this system
        PlanetAPI star2 = system2.initStar("hmi_york_star", // unique id for this star
                StarTypes.WHITE_DWARF, // id in planets.json
                300f, 		  // radius (in pixels at default zoom)
                100, // corona
                3f, // solar wind burn level
                0.7f, // flare probability
                2.0f); // CR loss multiplier, good values are in the range of 1-5
        system2.setLightColor(new Color(200, 200, 200)); // light color in entire system, affects all entities
        system2.getLocation().set(23000, 29000);

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

        float radiusAfterYork = StarSystemGenerator.addOrbitingEntities(system2, star2, StarAge.YOUNG,
                3, 6, // min/max entities to add
                5000, // radius to start adding at
                0, // name offset - next planet will be <system name> <roman numeral of this parameter + 1>
                true, // whether to use custom or system-name based names
                false); // whether to allow habitable worlds

        //JUMP POINT
        JumpPointAPI jumpPointYork = Global.getFactory().createJumpPoint("york_jumpPointA", "York Inner Jump-Point");
        OrbitAPI orbitYork = Global.getFactory().createCircularOrbit(star2, 180, 4500, 380);
        jumpPointYork.setOrbit(orbitYork);
        jumpPointYork.setStandardWormholeToHyperspaceVisual();
        system2.addEntity(jumpPointYork);

        system2.autogenerateHyperspaceJumpPoints(true, true);

        cleanup(system2);

        ///ESSEX, SYSTEM 3///

        system3.setBackgroundTextureFilename("graphics/backgrounds/background2.jpg");

        // create the star and generate the hyperspace anchor for this system
        PlanetAPI star3 = system3.initStar("hmi_essex_star", // unique id for this star
                "star_yellow", // id in planets.json
                750f, 		  // radius (in pixels at default zoom)
                500, // corona
                5f, // solar wind burn level
                0.7f, // flare probability
                3.0f); // CR loss multiplier, good values are in the range of 1-5
        system3.setLightColor(new Color(255, 245, 225)); // light color in entire system, affects all entities
        system3.getLocation().set(28500, 34000);

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

        float radiusAfterEssex = StarSystemGenerator.addOrbitingEntities(system3, star3, StarAge.YOUNG,
                3, 6, // min/max entities to add
                6000, // radius to start adding at
                0, // name offset - next planet will be <system name> <roman numeral of this parameter + 1>
                true, // whether to use custom or system-name based names
                false); // whether to allow habitable worlds

        //JUMP POINT
        JumpPointAPI jumpPointEssex = Global.getFactory().createJumpPoint("essex_jumpPointA", "Essex Inner Jump-Point");
        OrbitAPI orbitEssex = Global.getFactory().createCircularOrbit(star3, 120, 4000, 320);
        jumpPointEssex.setOrbit(orbitEssex);
        jumpPointEssex.setStandardWormholeToHyperspaceVisual();
        system3.addEntity(jumpPointEssex);

        system3.autogenerateHyperspaceJumpPoints(true, true);

        cleanup(system3);


        ///EXETER, SYSTEM 4///

///        StarSystemAPI system4 = sector.createStarSystem("Exeter");
        system4.setBackgroundTextureFilename("graphics/backgrounds/background5.jpg");


        // create the star and generate the hyperspace anchor for this system
        PlanetAPI star4 = system4.initStar("hmi_exeter_star", // unique id for this star
                "star_orange", // id in planets.json
                600f, 		  // radius (in pixels at default zoom)
                700, // corona
                10f, // solar wind burn level
                0.7f, // flare probability
                3.0f); // CR loss multiplier, good values are in the range of 1-5
        system4.setLightColor(new Color(255, 230, 220)); // light color in entire system, affects all entities
        system4.getLocation().set(26000, 28000);

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

        float radiusAfterExeter = StarSystemGenerator.addOrbitingEntities(system4, star4, StarAge.YOUNG,
                1, 3, // min/max entities to add
                6000, // radius to start adding at
                0, // name offset - next planet will be <system name> <roman numeral of this parameter + 1>
                true, // whether to use custom or system-name based names
                false); // whether to allow habitable worlds

        //JUMP POINT
        JumpPointAPI jumpPointExeter = Global.getFactory().createJumpPoint("exeter_jumpPointA", "Exeter Inner Jump-Point");
        OrbitAPI orbitExeter = Global.getFactory().createCircularOrbit(star4, 20, 5000, 360);
        jumpPointExeter.setOrbit(orbitExeter);
        jumpPointExeter.setStandardWormholeToHyperspaceVisual();
        system4.addEntity(jumpPointExeter);

        system4.autogenerateHyperspaceJumpPoints(true, true);

        cleanup(system4);

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
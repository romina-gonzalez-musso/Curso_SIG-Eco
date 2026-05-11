/// --------------------------- CURSO SIG EN ECOLOGIA 2026 --------------------------- //////
///                         GLOBAL FOREST CHANGE (HANSEN ET AL) 
/// --------------------------------------------------------------------------------- //////


// --------- TRAER DATASET ----------------------------------------

var gfc = ee.Image('UMD/hansen/global_forest_change_2025_v1_13');

print('Dataset Hansen:', gfc);

// Ver bandas disponibles
print('Bandas disponibles:', gfc.bandNames());

// Resolución espacial
var res = gfc.projection().nominalScale();
print('Resolucion espacial (m)', res);

// --------- VISUALIZAR TREE COVER ------------------------

var treeCoverVis = {
  bands: ['treecover2000'],
  min: 0,
  max: 100,
  palette: ['black', 'green']
};

Map.addLayer(gfc.clip(geometry), treeCoverVis, 'Tree Cover 2000');

Map.centerObject(geometry, 7);

// --------- VISUALIZAR LOSS YEAR ------------------------

var lossYearVis = {
  bands: ['lossyear'],
  min: 0,
  max: 25,
  palette: ['yellow', 'orange', 'red']
};

Map.addLayer(gfc.clip(geometry), lossYearVis, 'Forest Loss Year');

// --------- VISUALIZAR GAIN ------------------------

var gain = gfc.select('gain').selfMask();

var gainVis = {
  palette: ['cyan']
};

Map.addLayer(gain.clip(geometry), gainVis, 'Forest Gain');

// --------- EXPORTAR------------------------

// Tree cover
Export.image.toDrive({
  image: gfc.select('treecover2000').clip(geometry),
  description: 'TreeCover2000',
  folder: 'GEE_export',
  scale: 30,
  region: geometry,
  maxPixels: 1e13
});

// Loss
Export.image.toDrive({
  image: gfc.select('lossyear').clip(geometry),
  description: 'ForestLossYear',
  folder: 'GEE_export',
  scale: 30,
  region: geometry,
  maxPixels: 1e13
});

// Gain
Export.image.toDrive({
  image: gfc.select('gain').clip(geometry),
  description: 'ForestGain',
  folder: 'GEE_export',
  scale: 30,
  region: geometry,
  maxPixels: 1e13
});

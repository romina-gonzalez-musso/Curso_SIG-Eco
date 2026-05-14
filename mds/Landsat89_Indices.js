// ============================================================
// ÍNDICES DE VEGETACIÓN Y AGUA - LANDSAT 8 Y 9
// Índices: NDVI, SAVI, EVI, MNDWI
// ============================================================

// Definir que el baselayer sea el Google Satellite -----------------------
Map.setOptions('SATELLITE');
Map.centerObject(geometry, 8);

// Definir fecha de inicio y fin ------------------------------------------
var startDate = '2023-06-01';
var endDate   = '2023-06-21';

// Máscara de nubes -------------------------------------------------------
// Usa la banda QA_PIXEL: bit 3 = sombra de nube, bit 4 = nube
function cloudMask(image) {
  var qa   = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3)
               .or(qa.bitwiseAnd(1 << 4));
  return image.updateMask(mask.not());
}

// Factores de escala para bandas ópticas (Surface Reflectance) -----------
// Landsat C02 L2: reflectancia = DN * 0.0000275 + (−0.2)
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.')
                          .multiply(0.0000275)
                          .add(-0.2);
  return image.addBands(opticalBands, null, true);
}

// Cálculo de índices espectrales -----------------------------------------

// NDVI – Normalized Difference Vegetation Index
// NDVI = (NIR - Red) / (NIR + Red)
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4'])
                  .rename('NDVI');
  return image.addBands(ndvi);
}

// SAVI – Soil Adjusted Vegetation Index
// Reduce el efecto del suelo desnudo en áreas de baja cobertura vegetal
// SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L)   → L = 0.5
function addSAVI(image) {
  var L    = 0.5;
  var nir  = image.select('SR_B5');
  var red  = image.select('SR_B4');
  var savi = nir.subtract(red)
               .divide(nir.add(red).add(L))
               .multiply(1 + L)
               .rename('SAVI');
  return image.addBands(savi);
}

// EVI – Enhanced Vegetation Index
// Más robusto que NDVI en zonas de alta biomasa y con aerosoles
// EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
function addEVI(image) {
  var nir  = image.select('SR_B5');
  var red  = image.select('SR_B4');
  var blue = image.select('SR_B2');
  var evi  = nir.subtract(red)
               .multiply(2.5)
               .divide(nir.add(red.multiply(6))
                          .subtract(blue.multiply(7.5))
                          .add(1))
               .rename('EVI');
  return image.addBands(evi);
}

// MNDWI – Modified Normalized Difference Water Index
// Resalta cuerpos de agua y suprime vegetación y suelo
// MNDWI = (Green - SWIR1) / (Green + SWIR1)
function addMNDWI(image) {
  var mndwi = image.normalizedDifference(['SR_B3', 'SR_B6'])
                   .rename('MNDWI');
  return image.addBands(mndwi);
}

// Llamar a las colecciones de Landsat 8 y 9 ------------------------------
// Bandas ópticas necesarias + QA_PIXEL para la máscara de nubes
var bandsL89 = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'QA_PIXEL'];

var L9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .select(bandsL89)
  .filterBounds(geometry)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(cloudMask)
  .map(applyScaleFactors)
  .map(addNDVI)
  .map(addSAVI)
  .map(addEVI)
  .map(addMNDWI);

var L8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .select(bandsL89)
  .filterBounds(geometry)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(cloudMask)
  .map(applyScaleFactors)
  .map(addNDVI)
  .map(addSAVI)
  .map(addEVI)
  .map(addMNDWI);

print(L9, 'Landsat 9 - Índices');
print(L8, 'Landsat 8 - Índices');

// Crear el compuesto de imágenes (mediana) --------------------------------
var LandsatColl = L8.merge(L9);

var NDVI  = LandsatColl.select('NDVI') .median().clip(geometry);
var SAVI  = LandsatColl.select('SAVI') .median().clip(geometry);
var EVI   = LandsatColl.select('EVI')  .median().clip(geometry);
var MNDWI = LandsatColl.select('MNDWI').median().clip(geometry);

// Paletas de visualización ------------------------------------------------
var visNDVI = {
  min: -0.2, max: 0.8,
  palette: ['ffffff', 'ce7e45', 'df923d', 'f1b555', 'fcd163',
            '99b718', '74a901', '66a000', '529400', '3e8601',
            '207401', '056201', '004c00', '023b01', '012e01']
};

var visSAVI = {
  min: -0.2, max: 0.7,
  palette: ['f5f5dc', 'aacc00', '4d7a00', '1a4d00']
};

var visEVI = {
  min: -0.2, max: 0.8,
  palette: ['ffffff', 'fde8b0', 'b5e22e', '3ae237', '1a9900', '004c00']
};

var visMNDWI = {
  min: -0.5, max: 0.5,
  palette: ['8b4513', 'f5f5dc', '00bfff', '0000ff', '00008b']
};

// Agregar capas al mapa ---------------------------------------------------
Map.addLayer(NDVI,  visNDVI,  'NDVI  (Landsat 8+9)');
Map.addLayer(SAVI,  visSAVI,  'SAVI  (Landsat 8+9)');
Map.addLayer(EVI,   visEVI,   'EVI   (Landsat 8+9)');
Map.addLayer(MNDWI, visMNDWI, 'MNDWI (Landsat 8+9)');

// Exportar a Google Drive -------------------------------------------------
Export.image.toDrive({
  image: NDVI,
  description: 'Landsat89_NDVI',
  scale: 30,
  crs: 'EPSG:4326',
  folder: 'GEE_export'
});

Export.image.toDrive({
  image: SAVI,
  description: 'Landsat89_SAVI',
  scale: 30,
  crs: 'EPSG:4326',
  folder: 'GEE_export'
});

Export.image.toDrive({
  image: EVI,
  description: 'Landsat89_EVI',
  scale: 30,
  crs: 'EPSG:4326',
  folder: 'GEE_export'
});

Export.image.toDrive({
  image: MNDWI,
  description: 'Landsat89_MNDWI',
  scale: 30,
  crs: 'EPSG:4326',
  folder: 'GEE_export'
});

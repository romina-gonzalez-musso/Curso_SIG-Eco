/// ------------------- CURSO SIG EN ECOLOGIA 2025 ---------------- //////
///                        COMPOSITE DE IMAGENES
///                            LANDSAT 8
/// -------------------------------------------------------------- //////

// --------- DEFINIR FECHA ----------------------------------------
var inicio = '2021-08-01'
var final = '2022-01-01'
var cloud_cover = 20


// --------- TRAER COLECCION DE IMAGENES --------------------
var L8_Col= ee.ImageCollection("LANDSAT/LC08/C02/T1_L2") 
  .filterDate (inicio, final) 
  .filterBounds (geometry) 
  .filterMetadata ('CLOUD_COVER', 'Less_Than', cloud_cover);


// Aplicar los factores de escalado 
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// Calcular NDVI
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  return image.addBands(ndvi);
}


var L8_Col = L8_Col.map(applyScaleFactors);
var L8_Col = L8_Col.map(addNDVI)


// Filtro de nubes completo actualizado a Collection 2
function maskL8sr(image) {
  // Bits de la banda de calidad
  var dilatedCloudBitMask = (1 << 1);
  var cirrusCloudBitMask = (1 << 2);
  var cloudBitMask = (1 << 3);
  var cloudShadowBitMask = (1 << 4);
  //var snowBitMask = (1 << 5);
  // Get the pixel QA band.
  var qa = image.select('QA_PIXEL');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(dilatedCloudBitMask).eq(0)
                 .and(qa.bitwiseAnd(cirrusCloudBitMask).eq(0))
                 .and(qa.bitwiseAnd(cloudBitMask).eq(0))
                 .and(qa.bitwiseAnd(cloudShadowBitMask).eq(0))
                 //.and(qa.bitwiseAnd(snowBitMask).eq(0))
  return image.updateMask(mask);
}

var L8_Col = L8_Col.map(maskL8sr);


// Crear el compuesto
var L8_comp = L8_Col.median().clip(geometry)


// ---------  VER INFORMACION DE LAS IMAGENES ------------------
print (L8_Col.size(), 'Tamaño de la coleccion');

print(L8_comp, 'Metadata')


// ---------  VISUALIZAR ------------------
var visRGB = {bands: ['SR_B4', 'SR_B3', 'SR_B2'], 
  min: 0.0,
  max: 0.3,
};

// NIR / SWIR1 / RED
var visIR = {bands: ['SR_B5', 'SR_B6', 'SR_B4'], 
  min: 0.0,
  max: 0.4,
};


Map.centerObject(geometry, 9)

Map.addLayer(L8_comp, visRGB, 'True Color');
Map.addLayer(L8_comp, visIR, 'False Color');
Map.addLayer(L8_comp.select('NDVI'), {}, 'NDVI')


// --------- DESCARGAR ---------------------------------------
Export.image.toDrive({
  image: L8_comp.select('NDVI'),
  description: 'L8_NDVI_composite_primavera',
  scale: 30,
  crs: 'EPSG:4326',
  folder: 'GEE_export',
  region: geometry});

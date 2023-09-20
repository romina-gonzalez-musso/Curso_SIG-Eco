/// --------------------------- CURSO SIG EN ECOLOGIA 2023 --------------------------- //////
///                         DESCARGA DE IMÁGENES INDIVIDUALES 
///                                   SENTINEL 2
/// --------------------------------------------------------------------------------- //////


// --------- DEFINIR FECHA ----------------------------------------
var date_start = '2023-01-01'
var date_end = '2023-02-28'

// --------- TRAER COLECCION DE IMAGENES ---------------------------
var S2_col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate(date_start, date_end)
                  .filterBounds (geometry)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  

// Elegir la imagen de menor nubosidad de la coleccion
var S2_image = S2_col.sort("CLOUDY_PIXEL_PERCENTAGE").first()


// ---------  VER INFORMACION DE LAS IMAGENES ---------------------------

print('Imagenes de la Coleccion', S2_col.size());   // Ver cantidad de imagenes en la coleccion

print(S2_image, 'Imagen con menor nubosidad')       // Metadatos de la imagen de menor nubosidad

print ('Fecha imagen seleccionada', ee.Date(S2_image.get('system:time_start')));  // Fecha de la imagen

print ('% de nubes de la imagen', S2_image.get("CLOUDY_PIXEL_PERCENTAGE")); // % de nubes


// Ver info sobre resolucion espacial bandas R G B y NIR1 (B2, B3, B4, B8)
var Res = (S2_image.select('B8').projection().nominalScale());
print ('Resolucion (m)', Res);



// ---------  VISUALIZAR IMAGENES ---------------------------
var visRGB = {min: -70, max: 1300, bands: ['B4', 'B3', 'B2'],};
var visFALSECOLOR = {min: -200, max: 3900, bands: ["B8", "B4", "B3"],};

Map.centerObject(geometry, 9);

// Imagen completa RGB
Map.addLayer(S2_image, visRGB, 'RGB');
Map.addLayer(S2_image, visFALSECOLOR, 'Falso Color IR');

// ---------  DESCARGAR IMAGEN---------------------------
Export.image.toDrive({
  image: S2_image.select("B8", "B4", "B3", "B2"),
  description: 'Sentinel2_20m',
  scale: 20,
  crs: 'EPSG:4326', 
  folder: 'GEE_export'});





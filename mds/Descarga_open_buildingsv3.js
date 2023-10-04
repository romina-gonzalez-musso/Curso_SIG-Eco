/// ---------------- CURSO SIG EN ECOLOGIA 2023 ------------------- //////
///               DESCARGA DE VECTORIAL POR ZONA
///                     OPEN BUILDINGS V3
/// -------------------------------------------------------------- //////

// TRAER EL FEATURE COLLECTION
var openbuildings = ee.FeatureCollection('GOOGLE/Research/open-buildings/v3/polygons')
      .filterBounds(geometry)
      
// FILTRAR POR EL ATRIBUTO CONFIDENCE Y VISUALIZAR
var t_065_070 = openbuildings.filter('confidence >= 0.65 && confidence < 0.7');
var t_070_075 = openbuildings.filter('confidence >= 0.7 && confidence < 0.75');
var t_gte_075 = openbuildings.filter('confidence >= 0.75');

Map.addLayer(t_065_070, {color: 'FF0000'}, 'Buildings confidence [0.65; 0.7)');
Map.addLayer(t_070_075, {color: 'FFFF00'}, 'Buildings confidence [0.7; 0.75)');
Map.addLayer(t_gte_075, {color: '00FF00'}, 'Buildings confidence >= 0.75');

Map.centerObject(geometry,14)

// EXPLORAR METADATOS
print('Metadatos', t_065_070)


// APLICAR UNA FUNCION PARA ACOMODAR EL FEATURE COLLECTION PARA EXPORTAR
// Para exportar hay que eliminar la propiedad latitude_longitude por eso se pone null
// Pero para conservar las coordenadas, se agrega un campo para cada una.
// Otra opcion seria usar selectors para droppear la propiedad latitude_longitude al exportar


var openbuildings = openbuildings.map(function(f){
  var coords = ee.Geometry(f.get("longitude_latitude")).coordinates()
  return f.set({
    longitude: coords.get(0),
    latitude: coords.get(1),
    longitude_latitude:null,
  })
})

// --------- DESCARGAR ---------------------------------------
// Export the FeatureCollection to a KML file.
Export.table.toDrive({
  collection: openbuildings.filterBounds(geometry),
  description:'open-buildings_v3_nqn',
  fileFormat: 'SHP', 
  folder: 'GEE_export'
});

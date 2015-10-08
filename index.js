var turfArea = require('turf-area')
var turfCentroid = require('turf-centroid')
var turfExtent = require('turf-Extent')

// tells koop that this is plugin
exports.type = 'plugin'

// name is used by koop to give models/controller access to plugin
exports.name = 'reverseGeocode'

var execute = function (feature, limit, koop, callback) {
  // assume a polygon for now, will need logic to differentiate between point and polygon reqs
  var input = JSON.parse(feature)
  _reverseGeocodePolygon(input, limit, koop, callback)
}

var _reverseGeocodePolygon = function (feature, limit, koop, callback) {
  var payload = {
    query: {
      function_score: {
        filter: {
          bool: {
            must: [
              {
                geo_shape: {
                  geom: {
                    shape: {
                      type: 'envelope',
                      coordinates: null
                    }
                  }
                }
              },
              {
                range: {
                  area: {
                    gte: null
                  }
                }
              }
            ]
          }
        },
        functions: [
          {
            gauss: {
              center: {
                origin: {
                  lat: null,
                  lon: null
                },
                offset: null,
                scale: null
              }
            },
            weight: 2
          },
          {
            gauss: {
              area: {
                origin: null,
                offset: null,
                scale: null
              }
            }
          }
        ],
        score_mode: 'multiply'
      }
    },
    size: null,
    fields: [
      '_source'
    ]
  }
  var area = turfArea(feature)
  var centroid = turfCentroid(feature).geometry.coordinates
  var extent = _convertExtent(turfExtent(feature))
  payload.size = limit || 1
  payload.query.function_score.filter.bool.must[0].geo_shape.geom.shape = extent
  payload.query.function_score.filter.bool.must[1].range.area.gte = area / 3
  payload.query.function_score.functions[0].gauss.center.origin.lon = centroid[0]
  payload.query.function_score.functions[0].gauss.center.origin.lat = centroid[1]
  payload.query.function_score.functions[0].gauss.center.offset = ((Math.sqrt(area) / 1000) * 0.1).toString() + 'km'
  payload.query.function_score.functions[0].gauss.center.scale = ((Math.sqrt(area) / 1000) * 0.5).toString() + 'km'
  payload.query.function_score.functions[1].gauss.area.origin = area.toString()
  payload.query.function_score.functions[1].gauss.area.offset = (area * 0.25).toString()
  payload.query.function_score.functions[1].gauss.area.scale = (area * 0.5).toString()
  koop.Cache.db._query('features', payload, callback)
}

var _convertExtent = function (coords) {
  var geometry = []
  // upper left
  geometry.push([parseFloat(coords[0]), parseFloat(coords[3])])
  // lower right
  geometry.push([parseFloat(coords[2]), parseFloat(coords[1])])
  var envelope = {
      'type': 'envelope',
      'coordinates': geometry
  }
  return envelope
}

exports.execute = execute

function hxlProxyToJSON(input){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function generateGraphes (geom, ipcData) {
    var ndx = crossfilter(ipcData);

    var map = dc.leafletChoroplethChart('#map');

    var mapDim = ndx.dimension(function(d){
        return d['#adm2+code'];
    });
    var mapGroup = mapDim.group();


    map.width($('#map').width())
        // .height(350)
        .dimension(mapDim)
        .group(mapGroup)
        .center([0, 0])
        .zoom(0)
        .geojson(geom)
        .colors(['#DDDDDD', '#A7C1D3', '#71A5CA', '#3B88C0', '#056CB6'])
        .colorDomain([0, 4])
        .colorAccessor(function (d) {
            var c = 0
            if (d > 1) {
                c = 4;
            }
            return c
        })
        .featureKeyAccessor(function (feature) {
            return feature.properties['DIS_CODE'];

        }).popup(function (feature) {
            return feature.properties['DIST_NAME'];
        })
        .renderPopup(true);

        dc.renderAll();

        var m = map.map();
        zoomToGeom(geom);

        function zoomToGeom(geom) {
            var bounds = d3.geo.bounds(geom);
            m.fitBounds([
                [bounds[0][1], bounds[0][0]],
                [bounds[1][1], bounds[1][0]]
            ]);
        }

} //generateGraphes


var geomCall = $.ajax({
    type: 'GET',
    url: 'data/Somalia_District_Polygon.json',
    dataType: 'json',
});

var ipcDataCall = $.ajax({
    type: 'GET',
    url: 'https://data.humdata.org/hxlproxy/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1O2r2RBXL2bFwbMaZbxKRHU2kgnjHeppgHRJ7f4xeC4Y%2Fedit%23gid%3D1910750868',
    dataType: 'JSON',
});

$.when(geomCall, ipcDataCall).then(function(geomArgs, ipcDataArgs){
    var geom = geomArgs[0];
    var ipcData = hxlProxyToJSON(ipcDataArgs[0]);
    generateGraphes(geom, ipcData);
});

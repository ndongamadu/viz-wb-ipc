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
    ndx = crossfilter(ipcData);

    var map = dc.leafletChoroplethChart('#map');
    var mapDim = ndx.dimension(function(d){
        return d['#adm2+code'];
    });
    var mapGroup = mapDim.group();

    map.width($('#map').width())
        //.height(350)
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
            // console.log(feature.properties['DIST_NAME']);
            updateAreaChart(feature.properties['DIST_NAME']);
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

function getPhaseData(phase) {
    regionDimension.filter(function(d) {return d === currentRegion + '-' + phase});
    var array = regionDimension.top(Infinity);
    array.sort(function(a, b) {
        a = new Date(a['#date']);
        b = new Date(b['#date']);
        return a<b ? -1 : a>b ? 1 : 0;
    });
    //format data arrays for c3 area chart
    var phaseArray = [];
    var dateArray = [];
    dateArray.push('date');
    phaseArray.push(phase);
    for (var i=0; i<array.length; i++) {
        dateArray[i+1] = array[i]['#date']+'-01';
        phaseArray.push(array[i]['#output']);
    }
    return {output: phaseArray, date: dateArray};
}

function getKeyDriverIndicatorData() {
    var selectedKeyDriver = $('#key_drivers option:selected').text();
    var selectedYear = $('#key_drivers_year option:selected').text();

    var array = regionDimension2.filter(function(d){
        return d === selectedYear+'-'+currentRegion+'-'+selectedKeyDriver;
    }).top(Infinity);

    var arrayAll = regionDimension2.filterAll().top(Infinity).filter(function(d){
        return d['#adm2+name']===currentRegion && d['#date'].split('-')[0]===selectedYear;
    });
    var kdTypes = [],
        kdPercentages = [];
    for (var i = 0; i < arrayAll.length; i++) {
        kdTypes.includes(arrayAll[i]['#indicator+type']) ? '' : kdTypes.push(arrayAll[i]['#indicator+type']);
    }

    for (var i = 0; i < kdTypes.length; i++) {
        var valence=0;
        for (var k = 0; k < arrayAll.length; k++) {
            arrayAll[k]['#indicator+type']===kdTypes[i] ? valence +=1 : '';
        }
        kdPercentages[i] = (valence/arrayAll.length)*100 ;
    }
    array.sort(function(a, b) {
        if (a.key > b.key) return 1;
        if (a.key < b.key) return -1;
        return 0;
    });

    var indicatorsArray = [],
        valuesArray = [];
    indicatorsArray.push('x');
    valuesArray.push('Importance');
    for (var i = 0; i < array.length; i++) {
        indicatorsArray.includes(array[i]['#indicator']) ? '' : indicatorsArray.push(array[i]['#indicator']);
    }
    for (var i = 1; i < indicatorsArray.length; i++) {
        var sum = 0 ;
        for (var j = 0; j < array.length; j++) {
            array[j]['#indicator']===indicatorsArray[i] ? sum += Number(array[j]['#output']) : '';
        }
        valuesArray[i] = sum;
    }
    return {indicators: [valuesArray, indicatorsArray], types: [kdTypes,kdPercentages]};
} // getKeyDriverIndicatorData

function generateAreaChart(ipcData, kdData) {
    ndx = crossfilter(ipcData);
    regionDimension = ndx.dimension(function(d){
        var phase = d['#indicator+ipc'].replace(' ', '');
        return d['#adm2+name']+'-'+phase;
    });

    ndx2 = crossfilter(kdData);
    regionDimension2 = ndx2.dimension(function(d){
        var annee = d['#date'].split('-')[0];
        return annee+'-'+d['#adm2+name']+'-'+d['#indicator+type'];
    });

    var dateArray = getPhaseData('Phase1').date;
    var numYears = Math.round(dateArray.length/12);

    areaChart = c3.generate({
        bindto: '#areaChart',
        title: { text: 'Phase Population Distribution' },
        transition: {duration: 100 },
        padding: { right: 20, top: 40 },
        data: {
            x: 'date',
            columns: [
                dateArray,
                getPhaseData('Phase1').output,
                getPhaseData('Phase2').output,
                getPhaseData('Phase3').output,
                getPhaseData('Phase4').output,
                getPhaseData('Phase5').output
            ],
            type: 'area-spline',
            colors: {
                Phase1: colorIPC[0],
                Phase2: colorIPC[1],
                Phase3: colorIPC[2],
                Phase4: colorIPC[3],
                Phase5: colorIPC[4]
            },
            groups: [['Phase1', 'Phase2' ,'Phase3', 'Phase4', 'Phase5']]
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: "%Y",
                    count: numYears
                },
                padding: { right: 20, left: 0 }
            },
            y: { min: 0.1 }
        },
        tooltip: {
            format: {
                title: function (d) { return monthNames[d.getMonth()]+ ' ' +d.getFullYear(); },
                name: function (name) { return name.replace('Phase', 'Phase '); },
                value: d3.format(',.3f')
            }
        },
        legend: {
            show: false
        }
    });

    var legendTitles = {Phase1: 'Phase 1<br>Minimal',
                        Phase2: 'Phase 2<br>Stressed',
                        Phase3: 'Phase 3<br>Crisis',
                        Phase4: 'Phase 4<br>Emergency',
                        Phase5: 'Phase 5<br>Famine',
    };
    d3.select('#areaChart').insert('div', '.chart').attr('class', 'legend').selectAll('span')
        .data(['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5'])
      .enter().append('span')
        .attr('data-id', function (id) { return id; })
        .html(function (id) { return legendTitles[id]; })
        .each(function (id) {
            var num = id[id.length-1];
            d3.select(this).style('background-color', colorIPC[num-1]);
        })
        .on('mouseover', function (id) {
            areaChart.focus(id);
        })
        .on('mouseout', function (id) {
            areaChart.revert();
        })
        .on('click', function (id) {
            areaChart.toggle(id);
        });

    // Key drivers bar chart
    var kdrivs = getKeyDriverIndicatorData();

    keyDriversChart = c3.generate({
        bindto:'#keydriversChart',
        data: {
            x: 'x',
            columns: [kdrivs.indicators[1], kdrivs.indicators[0]],
            type: 'bar',
        },
        axis:{
            rotated: true,
            x: { type: 'category' },
            y: { padding: {bottom: 0}}
        },
        tooltip:{
            format: {
                value: d3.format(',.3f')
            }
        }
    });

    //pie chart
    pieChart = c3.generate({
        bindto: '#pieChart',
        data: {
            rows:[kdrivs.types[0],kdrivs.types[1]],
            type: 'pie',
        },
        legend:{
            show: false,
        }
    })
}

function updateAreaChart(region) {
    currentRegion = region;
    areaChart.load({
        columns: [
            getPhaseData('Phase1').output,
            getPhaseData('Phase2').output,
            getPhaseData('Phase3').output,
            getPhaseData('Phase4').output,
            getPhaseData('Phase5').output
        ]
    });
    var kd = getKeyDriverIndicatorData();
    keyDriversChart.load({
        columns:[kd.indicators[1],kd.indicators[0]]
    });
    pieChart.load({
        rows:[kd.types[1],kd.types[0]]
    });
}

$('#key_drivers').on('change', function(e){
    var kd = getKeyDriverIndicatorData();
    keyDriversChart.load({
        columns:[kd.indicators[1],kd.indicators[0]]
    });
    pieChart.load({
        rows:[kd.types[1],kd.types[0]]
    });
});
$('#key_drivers_year').on('change', function(e){
    var kd = getKeyDriverIndicatorData();
    keyDriversChart.load({
        columns:[kd.indicators[1],kd.indicators[0]]
    });
    pieChart.load({
        rows:[kd.types[1],kd.types[0]]
    });
});

//global vars
var currentRegion = 'Baki';
var ndx, areaChart, regionDimension,
    ndx2, keyDriversChart, regionDimension2,
    pieChart;
var colorIPC = ['#CCFFCC','#FAE61E','#E67800','#C80000','#640000'];
var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];


var geomCall = $.ajax({
    type: 'GET',
    url: 'data/Somalia_District_Polygon.json',
    dataType: 'json',
});
//,https://data.humdata.org/hxlproxy
var ipcDataCall = $.ajax({
    type: 'GET',
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1O2r2RBXL2bFwbMaZbxKRHU2kgnjHeppgHRJ7f4xeC4Y%2Fedit%23gid%3D1910750868',
    dataType: 'JSON',
});
var ipcKeyDriversDataCall = $.ajax({
    type: 'GET',
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1HYWionmx6RDoGb8cG2eh6TrArsNqt2JvqtvYSYxNEcg%2Fedit%3Fusp%3Dsharing',
    dataType: 'JSON',
});


$.when(geomCall, ipcDataCall, ipcKeyDriversDataCall).then(function(geomArgs, ipcDataArgs, ipcKeyDriversDataArgs){
    var geom = geomArgs[0];
    var ipcData = hxlProxyToJSON(ipcDataArgs[0]);
    var ipcKeyDriversData = hxlProxyToJSON(ipcKeyDriversDataArgs[0]);
    generateGraphes(geom, ipcData);
    generateAreaChart(ipcData, ipcKeyDriversData);

    //display main
    $('.sp-circle').remove();
    $('main').removeClass('hidden');
});

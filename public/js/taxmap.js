$(document).ready(function() {
    var UNDEFINEDCLR = '#000';
    var ZEROCLR = '#F00';
    var num_format = d3.format(",");

    var map = L.map('map').setView([40.78233, -73.97919], 16);
    L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/48569/256/{z}/{x}/{y}.png', {
        maxZoom: 20,
        minZoom: 16,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
    }).addTo(map);
    map.on('dragend', function(e) {
        updatePolygons(false);
    });
    map.on('zoomend', function(e) {
        updatePolygons(true);
    });

    var color = d3.scale.quantile();
    color.domain([0, 1000000]).range(colorbrewer.Greens[9]);
    updatePolygons(false);
    
    //make the flyout follow the mouse
    $("#map").mousemove(function(e) {
        jQuery('#flyout').css({
            'left': e.pageX - 215,
            'top': e.pageY - jQuery(document).scrollTop() - 120
        });
    });

    $('#sidebar').delegate('.tab', 'click', function() {
        $(this).slideUp(500);
    });

    function updatePolygons(isZoom) {
        $(".map-pane-overlay")
        var bboxString = map.getBounds().toBBoxString();
        var center = map.getCenter();
        var lat = center.lat;
        var lon = center.lng;
        if (isZoom) {
            $('svg').css('display', 'none');
        }
        d3.json("http://nyctaxmap.herokuapp.com/taxlots?bbox=" + bboxString, function(data) {
            map.setView([lat, lon]);
            map.viewreset;
            $('svg').remove();
            var svg = d3.select(map.getPanes().overlayPane).append("svg").attr('width', window.screen.width).attr('height', window.screen.height),
                g = svg.append("g").attr("class", "leaflet-zoom-hide");
            var transform = d3.geo.transform({
                point: projectPoint
            }),
                path = d3.geo.path().projection(transform);
            bounds = path.bounds(data);
            var topLeft = bounds[0],
                bottomRight = bounds[1];
            svg.attr("width", bottomRight[0] - topLeft[0]).attr("height", bottomRight[1] - topLeft[1]).style("left", topLeft[0] + "px").style("top", topLeft[1] + "px");
            g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
            var feature = g.selectAll("path").data(data.features).enter().append("path").attr('fill', function(d) {
                if (d.properties && d.properties.years) {
                    if (d.properties.years[0].annualTax === 0) {
                        return ZEROCLR;
                    }
                    return (d.properties.years[0].annualTax) ? color(d.properties.years[0].annualTax) : UNDEFINEDCLR;
                }
                return UNDEFINEDCLR;
            }).attr("d", path);
            feature.on('mouseover', function(d) {
                updateFlyout(d.properties);
            });
            feature.on('click', function(d) {
                addTab(d.properties);
            });
            feature.on('mouseout', function(d) {
                flyoutTimer = setTimeout(function() {
                    $("#flyout").fadeOut(50);
                }, 50);
            });
        });
    }

    function projectPoint(x, y) {
        var point = map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    }


    function addTab(p) {
        var borough = String(p.billingbbl).charAt(0);
        var block = String(p.billingbbl).substring(1, 6);
        var lot = String(p.billingbbl).substring(6, 10);
        var tab = $('#taxTabTemplate').clone().slideDown(150);
        tab.find('.borough.taxData').html(borough);
        tab.find('.block.taxData').html(block);
        tab.find('.lot.taxData').html(lot);
        tab.find('.address .taxData').html(p.propertyAddress);
        tab.find('.ownerName .taxData').html(p.ownerName);
        tab.find('.taxClass .taxData').html(p.taxClass);
        tab.find('.estimatedValue .taxData').html(toDollars(p.years[0].estimatedValue));
        tab.find('.assessedValue .taxData').html(toDollars(p.years[0].assessedValue));
        tab.find('.taxRate .taxData').html(p.years[0].taxRate);
        tab.find('.taxBefore .taxData').html(toDollars(p.years[0].taxBefore));
        tab.find('.exemptions .taxData').html(toDollars(p.years[0].taxBefore - p.years[0].annualTax));
        tab.find('.annualTax .taxData').html(toDollars(p.years[0].annualTax));
        tab.find('.unitsTotal .taxData').html(p.unitsTotal);
        tab.find('.taxPerUnit .taxData').html(toDollars(p.years[0].annualTax / p.unitsTotal));
        tab.find('.taxBillLink a').click(function(e) {
            e.preventDefault();
            var billUrl = 'http://nycprop.nyc.gov/nycproperty/StatementSearch?bbl=' + p.billingbbl + '&stmtDate=20131122&stmtType=SOA';
            window.open(billUrl);
        });
        $(tab[0]).removeAttr('id').addClass('active');
        $('#sidebar').append(tab);
        tab.show();
        tab.find('.close').click(function(e) {
            tab.remove();
        })
    }
    // sidebar needs to have up to 3 tabs. When a property is clicked, it should put all the variables in a tab. When the 2nd is clicked, it should put it in the tab below. 3rd is same. When the 4th is clicked, it should remove the first tab and insert a new tab below. Tabs should have an exit circle to click and get out of the tab. If tab 1 is exited, move tabs 2 and 3 up. If tab 2 is clicked, move tab 3 up...
    // first step - clone the taxTabTemplate when a property is clicked, and fill in the appropriate fields.

    function updateFlyout(d) {
        $('#flyoutAddress').html(d.propertyAddress);
        if (d.years) {
            $('#flyoutTax').html(toDollars(d.years[0].annualTax));
        }
        clearTimeout(flyoutTimer);
        $('#flyout').fadeIn(50);
    }

    function clearSidebar() {
        $('.taxData').html("");
    }

    function projectPoint(x, y) {
        var point = map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    }

    function toDollars(n) {
        //if (!n) return 'undefined';
        if (typeof n == 'String') n = parseInt(n);
        var dollars = n.toFixed(0).toString().split('').reverse().join('').replace(/(?=\d*\.?)(\d{3})/g, '$1,').split('').reverse().join('').replace(/^[\,]/, '');
        return "$" + dollars;
    }
});
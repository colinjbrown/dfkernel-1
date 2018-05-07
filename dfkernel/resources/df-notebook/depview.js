define(["jquery",
    "base/js/namespace",
    '/kernelspecs/dfpython3/df-notebook/d3.v3.min.js',
    '/kernelspecs/dfpython3/df-notebook/dagre-d3.min.js',
    '/kernelspecs/dfpython3/df-notebook/tooltipsy.min.js'
    ],
    function($, Jupyter, d3, dagreD3) {
    "use strict";
        var max_level,min_level = 0;
        var cell_links = [],
            cell_list = [],
            cell_child_nums = [],
            output_nodes = [];

        var tipsy_css = {
                        'padding': '10px',
                        'color': '#303030',
                        'background-color': '#000',
                        'border': '1px solid #999',
                        '-moz-box-shadow': '0 0 10px rgba(0, 0, 0, .5)',
                        '-webkit-box-shadow': '0 0 10px rgba(0, 0, 0, .5)',
                        'box-shadow': '0 0 10px rgba(0, 0, 0, .5)',
                        'text-shadow': 'none'
                    };

        var margin = {top:20, right:120, bottom:20, left: 120},
            width = $(window).width() - margin.right - margin.left,
            height = $(window).height() - margin.top - margin.bottom;

        var tooltipstyle = function(cellid,source){
            return "<p class ='cellid'>Cell: " + cellid + "</p><pre class='CodeMirror-line'>Source:\n" + source + "</pre>";
        };

        var close_div = function(){
            var dep_div = $('.dep-div')[0];
                dep_div.style.width = "0%";
                dep_div.zIndex = '-999';
                $('.control-div').remove();
                d3.selectAll("div.tooltipsy").remove();
                d3.select("div.dep-div svg").transition().delay(1000).remove();
        };


        var create_dep_div = function() {
            var link = document.createElement("link");
            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = require.toUrl('/kernelspecs/dfpython3/df-notebook/depview.css','css');
            document.getElementsByTagName("head")[0].appendChild(link);

            var closebtn = document.createElement('a');
            closebtn.setAttribute("class","closebutton");
            closebtn.setAttribute("href","#");
            closebtn.innerHTML = "&times;";
            var depdiv = document.createElement('div');
            depdiv.setAttribute('class','dep-div');
            //This is a very "goofy" way to have to do this, this seems to be evaluated if you make onclick = close_div()
            closebtn.onclick = function() { close_div()};
            depdiv.append(closebtn);
            $('body').append(depdiv);
            return depdiv;
        };

        var attach_controls = function(depdiv){
            var control_div = document.createElement("div");
            control_div.className = 'control-div';
            var up_levels = document.createElement("INPUT");
            up_levels.setAttribute("type", "range");
            up_levels.min = 0;
            up_levels.max = max_level;
            up_levels.value = max_level;
            var text_up = document.createTextNode(up_levels.value);
            control_div.appendChild(document.createTextNode("Upstream Levels Shown: "));
            control_div.appendChild(text_up);
            control_div.appendChild(up_levels);
            var down_levels = document.createElement("INPUT");
            down_levels.setAttribute("type", "range");
            down_levels.min = min_level;
            down_levels.max = 0;
            down_levels.value = min_level;
            var text_down = document.createTextNode(down_levels.value);
            control_div.appendChild(document.createTextNode("Downstream Levels Shown: "));
            control_div.appendChild(text_down);
            down_levels.onchange = function(){text_down.textContent=down_levels.value;recreate_graph(up_levels.value,down_levels.value);};
            up_levels.onchange = function(){text_up.textContent=up_levels.value; recreate_graph(up_levels.value,down_levels.value);};
            control_div.appendChild(down_levels);
            depdiv.appendChild(control_div);
        };

        var create_graph = function(svg, g,inner){

            g.nodes().forEach(function(v) {
                var node = g.node(v);
                // Round the corners of the nodes
                node.rx = node.ry = 5;
            });

            var zoom = d3.behavior.zoom().on("zoom", function() {
                inner.attr("transform", "translate(" + d3.event.translate + ")" +
                    "scale(" + d3.event.scale + ")");
            });
            svg.call(zoom);

            var render = new dagreD3.render();

            g.graph().transition = function(selection) {
                return selection.transition().duration(500);
            };

            render(d3.select("svg g"),g);

            var initialScale = 0.75;
            zoom
                .translate([(svg.attr("width") - g.graph().width * initialScale) / 2, 20])
                .scale(initialScale)
                .event(svg);
            svg.attr('height', g.graph().height * initialScale + 40);

            svg.selectAll("g.parentnode, .cluster")
                .attr("title",function () {
                    var node = d3.select(this),
                    cellid = node.select('tspan').text().substr("Cell ID: ".length,6);
                return tooltipstyle(cellid,Jupyter.notebook.get_code_cell(cellid).get_text());
            }).on("mouseover",function(){
                var node = d3.select(this),
                    cellid = node.select('tspan').text().substr("Cell ID: ".length,6);
                var cell = Jupyter.notebook.get_code_cell(cellid);
                cell.cell_imm_downstream_deps.forEach(function (t) { d3.select('#'+t.substr(0,6)+'cluster').select('rect').style('stroke','red'); svg.selectAll('g.'+cellid+t.substr(0,6)).select('path').style('stroke-width','4px').style('stroke','red'); });
                cell.cell_imm_upstream_deps.forEach(function (t) { d3.select('#'+t.substr(0,6)+'cluster').select('rect').style('stroke','blue'); svg.selectAll('g.'+t.substr(0,6)+cellid).select('path').style('stroke-width','4px').style('stroke','blue'); });
                d3.select(this).select("rect").style({"stroke":"green"});
            }).on("mouseout",function(){
                var node = d3.select(this),
                    cellid = node.select('tspan').text().substr("Cell ID: ".length,6);
                var cell = Jupyter.notebook.get_code_cell(cellid);
                cell.cell_imm_downstream_deps.forEach(function (t) { d3.select('#'+t.substr(0,6)+'cluster').select('rect').style('stroke','#999'); svg.selectAll('g.'+cellid+t.substr(0,6)).select('path').style('stroke-width','1.5px').style('stroke','black'); });
                cell.cell_imm_upstream_deps.forEach(function (t) { d3.select('#'+t.substr(0,6)+'cluster').select('rect').style('stroke','#999'); svg.selectAll('g.'+t.substr(0,6)+cellid).select('path').style('stroke-width','1.5px').style('stroke','black');});
                d3.select(this).select("rect").style({"stroke":"#999"});
            }).on("contextmenu",function() {

                return false;
            })
            .each(function () {
                $(this).tooltipsy({
                    css: tipsy_css
                });
            });

            $("g.parentnode, .cluster").css('fill',function(t){
                var cellid = d3.select(this).select('tspan').text().substr("Cell ID: ".length, 6);
                if(Jupyter.notebook.get_code_cell(cellid).was_changed){ d3.select(this).style('stroke-dasharray', '10,10').style('stroke-width','4px'); return "yellow";}
                return;
            }).on('mousedown',function(event) {
                if(event.ctrlKey){
                                    var node = d3.select(this),
                    cellid = node.select('tspan').text().substr("Cell ID: ".length, 6);
                var visited = [];
                var down = Jupyter.notebook.get_code_cell(cellid).cell_imm_downstream_deps;
                while (down.length > 0) {
                    var child = down.pop();
                    visited.push(child);
                    Jupyter.notebook.get_code_cell(cellid.substr(0, 6)).cell_imm_downstream_deps.forEach(function (t) {
                        var subbed = t.substr(0, 6);
                        if (!(visited.includes(subbed)) && !(down.includes(subbed))) {
                            down.push(subbed);
                        }
                    })
                }
                visited.forEach(function (t) {
                    g.removeNode(t);
                });
                render(d3.select("svg g"), g);
                }
                else{
                    close_div();
                    var node = d3.select(this),
                        cellid = node.select('tspan').text().substr(9,6);
                    Jupyter.notebook.select_by_id(cellid);
                    Jupyter.notebook.scroll_to_cell_id(cellid);
                }
            }).on("contextmenu",function(event){return false;});

            $("g.parentnode").tooltip();
            //FIXME: This may be revisted, Clusterlabels get occluded by the arrows
            d3.selectAll('.cluster').select('tspan').style('stroke','none').style('fill','blue').style('font-family','monospace').style('font-size','1em').style('font-weight','normal').style('fill-opacity',0);
        };

        var recreate_graph = function(up,down){

            var svg = $('.dep-div svg');

            while (svg.firstChild) {
                svg.removeChild(svg.firstChild);
            }

            svg = d3.select('#svg');

            var margin = {top:30, right:120, bottom:20, left: 120},
            width = svg.width,
            height = svg.height;

            var inner =  svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var g = new dagreD3.graphlib.Graph({compound:true}).setGraph({}).setDefaultEdgeLabel(function () {
                return {};
            });

            var updated_cell_list = cell_list.filter(function(a){
                return a.level <= up && a.level >= down;
            }).map(function(a){ return a.id;});

            updated_cell_list.forEach(function(a){
                if(output_nodes[a]){g.setNode("Out["+a+"]", {label: "Cell ID: " + a + '\nOutputs:' + [].concat.apply(output_nodes[a] || "None"), text:"Test", class:'parentnode'});}
            });

            var updated_out_nodes = Object.keys(output_nodes).filter(function(a){
               return updated_cell_list.includes(a);
            });


            updated_out_nodes.forEach(function (a) {
                var parent = 'Out['+a+']';
                var cell = a+'[Cell]';
                g.setNode(cell,{label:cell,class:'childnode'});
                g.setParent(cell,parent);
                updated_cell_list.push(a+'[Cell]');
                output_nodes[a].forEach(function (t) {
                    var uuid = t.substr(4,6);
                    if(/Out\[[a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9]\]/.test(t)){
                        updated_cell_list.push(uuid);
                        g.setNode(uuid,{label:parent, class:'childnode'}); g.setParent(uuid,parent);
                    }
                    else{
                        updated_cell_list.push(a+t);
                        g.setNode(a+t,{label:t, class:'childnode'}); g.setParent(a+t,parent);
                    }
            }) });

            cell_links.forEach(function (a) {
                if(updated_cell_list.includes(a.source) && updated_cell_list.includes(a.target)) {
                    g.setEdge(a.source, a.target,{class:a.source.substr(0,6)+a.target.substr(0,6)});
                }
            });

            create_graph(svg,g,inner);

        };

    var create_dep_view = function(depdiv,dataflow,selected) {
        cell_links = [];
        cell_list = [];
        cell_child_nums = [];
        output_nodes = [];
        width = $(window).width() - margin.right - margin.left;
        height = $(window).height() - margin.top - margin.bottom;

        if(dataflow){
        Jupyter.notebook.get_cells().forEach(function(a) {
            if (a.cell_type == 'code') {
                var outnames = [];
                output_nodes[a.uuid] = [];
                if((a.output_area.outputs).length >= 1) {
                    output_nodes[a.uuid] = a.output_area.outputs.reduce(function (c, d) {
                        if(d.output_type != 'error' && d.output_type != 'stream'){
                            outnames.push(d.metadata.output_tag || a.uuid);
                            return c.concat(d.metadata.output_tag || "Out[" + a.uuid + "]");}
                        return c;
                    }, []);
                }

                cell_list.push({id: a.uuid});
                a.cell_imm_upstream_deps.forEach(function (b) {
                    if(outnames.includes(a.uuid)){
                        cell_links.push({source: b, target: a.uuid});
                    }
                    else{
                        cell_links.push({source: b, target: (a.uuid + "[Cell]")})
                    }
                });
            }
        });}
        else if(selected){
            max_level = 0;
            min_level = 0;
            var selected_cell = Jupyter.notebook.get_selected_cell();
            var upstreams = selected_cell.cell_imm_upstream_deps.concat(selected_cell.uuid).reduce(function(a,b){
                if(!(b.substr(0,6) in a)){ return a.concat(b.substr(0,6));}
            },[]);
            var downstreams = selected_cell.cell_imm_downstream_deps;
            var cells_list = new Set(upstreams.concat(downstreams));
            var levels = 1;
            var copied = upstreams.slice(0);
            while(upstreams.length > 0){
                var up = upstreams.pop();
                var cell = Jupyter.notebook.get_code_cell(up.substr(0,6));
                var outnames = [];
                cell_list.push({id: cell.uuid,level:levels});
                upstreams = upstreams.concat(cell.cell_imm_upstream_deps.reduce(function(a,b){
                var bstripped = b.substr(0,6);
                if(!(a.includes(bstripped)) && !(cells_list.has(bstripped))){
                    cells_list.add(bstripped);
                    return a.concat(bstripped);
                }
                return a;
            },[]));
                output_nodes[cell.uuid] = [];
                if((cell.output_area.outputs).length >= 1) {
                    output_nodes[cell.uuid] = cell.output_area.outputs.reduce(function (c, d) {
                        if(d.output_type != 'error' && d.output_type != 'stream'){
                            outnames.push(d.metadata.output_tag || cell.uuid);
                            return c.concat(d.metadata.output_tag || "Out[" + cell.uuid + "]");}
                        return c;
                    }, []);
                }
                cell.cell_imm_upstream_deps.forEach(function (b) {
                    if(outnames.includes(cell.uuid)){
                        cell_links.push({source: b, target: cell.uuid});
                    }
                    else{
                        cell_links.push({source: b, target: (cell.uuid + "[Cell]")})
                    }
                });
                if(!(copied.includes(cell.uuid)) && upstreams.length){
                    levels += 1;
                    copied.concat(upstreams);
                }
            }
            max_level = levels;
            levels = -1;
            copied = downstreams.slice(0);
            while(downstreams.length > 0){
                var down = downstreams.pop();
                var cell = Jupyter.notebook.get_code_cell(down);
                var outnames = [];
                cell_list.push({id: cell.uuid,level:levels});
                output_nodes[cell.uuid] = [];
                downstreams = downstreams.concat(cell.cell_imm_downstream_deps.reduce(function (a,b)
                {
                    if(!(cells_list.has(b))){
                        cells_list.add(downstreams);
                        return a.concat(b);
                    }
                    return a;
                    },[]));
                if((cell.output_area.outputs).length >= 1) {
                    output_nodes[cell.uuid] = cell.output_area.outputs.reduce(function (c, d) {
                        if(d.output_type != 'error' && d.output_type != 'stream'){
                            outnames.push(d.metadata.output_tag || cell.uuid);
                            return c.concat(d.metadata.output_tag || "Out[" + cell.uuid + "]");}
                        return c;
                    }, []);
                }
                cell.cell_imm_upstream_deps.forEach(function (b) {
                    if(cells_list.has(b.substr(0,6))) {
                        if (outnames.includes(cell.uuid)) {
                            cell_links.push({source: b, target: cell.uuid});
                        }
                        else {
                            cell_links.push({source: b, target: (cell.uuid + "[Cell]")})
                        }
                    }
                });
                if(!(copied.includes(cell.uuid)) && downstreams.length){
                    levels -= 1;
                    copied.concat(downstreams);
                }
            }
            min_level = levels;
            cell_list[0] = {id:selected_cell.uuid,level:0};
            console.log(cell_list);
        }
        else{
        Jupyter.notebook.get_cells().forEach(function(a) {
            if (a.cell_type == 'code') {
                var outnames = [];
                if((a.output_area.outputs).length >= 1) {
                    output_nodes[a.uuid] = a.output_area.outputs.reduce(function (c, d) {
                        if(d.output_type != 'error' && d.output_type != 'stream'){
                            outnames.push(d.metadata.output_tag || a.uuid);
                            return c.concat(d.metadata.output_tag || "Out[" + a.uuid + "]");}
                        return c;
                    }, []);
                    if(output_nodes[a.uuid].length == 0){
                        delete output_nodes[a.uuid];
                    }
                    cell_list.push({id: a.uuid});
                    a.cell_imm_upstream_deps.forEach(function (b) {
                        if(outnames.includes(a.uuid)){
                            cell_links.push({source: b, target: a.uuid});
                        }
                        else{
                            outnames.forEach(function (t) { cell_links.push({source: b, target: a.uuid+t}); });
                        }
                });
                }


            }

        });
        }
        cell_list.forEach(function(a) {cell_child_nums[a.id] = 0;});
        cell_links.forEach(function(a){ cell_child_nums[a.source] += 1;});

        depdiv.style.zIndex = '100';
        depdiv.style.width = '100%';


        var svg = d3.select("div.dep-div").append("svg")
                .attr("width", width + margin.right + margin.left)
                .attr("height", height + margin.top + margin.bottom)
                .attr("id","svg").on('contextmenu',function (){return false;}),
        inner =  svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var g = new dagreD3.graphlib.Graph({compound:true}).setGraph({}).setDefaultEdgeLabel(function () {
            return {};
        });



        cell_list.forEach(function(a){
            if(output_nodes[a.id]){
                if(selected && a.level == 0){ g.setNode("Out["+a.id+"]", {label: "Cell ID: " + a.id, id:'selected', clusterLabelPos:'top', class:'parentnode'});}
                else{g.setNode("Out["+a.id+"]", {label: "Cell ID: " + a.id,id:a.id+'cluster', clusterLabelPos:'top', class:'parentnode'});}
            }
        });

        var labelstyles = 'font-family: monospace; fill: #D84315; font-size: 1.3em;';

        Object.keys(output_nodes).forEach(function (a) {
            var parent = 'Out['+a+']';
            if(dataflow || selected){
                var cell = a+'[Cell]';
                g.setNode(cell,{label:'Cell['+a+']',class:'childnode', labelStyle:labelstyles});
                g.setParent(cell,parent);

            }
            output_nodes[a].forEach(function (t) {
                var uuid = t.substr(4,6);
                if(/Out\[[a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9]\]/.test(t)){
                    g.setNode(uuid,{label:parent, class:'childnode', labelStyle:labelstyles}); g.setParent(uuid,parent);
                }
                else{
                    g.setNode(a+t,{label:t, class:'childnode', labelStyle:labelstyles}); g.setParent(a+t,parent);
                }

        }) });

        cell_links.forEach(function (a) {
            g.setEdge(a.source,a.target,{class:a.source.substr(0,6)+a.target.substr(0,6)});
        });

        create_graph(svg,g,inner);
    };

     return {
        create_dep_div: create_dep_div,
        create_dep_view: create_dep_view,
         attach_controls: attach_controls,
    };
    });
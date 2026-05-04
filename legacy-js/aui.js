(function($) {

    "use strict";

    //Private properties

    // get path to this script's directory (as var _scripts_root) so we can construct relative paths (see http://bit.ly/1uG6CTY)
    var _scripts = document.getElementsByTagName('script');
    var _path = _scripts[_scripts.length - 1].src.split('?')[0]; /* remove any ?query */
    var _scripts_root = _path.split('/').slice(0, -1).join('/'); /* remove last filename part of path */
    if (_scripts_root.indexOf('http://') == 0 || _scripts_root.indexOf('https://') == 0) {_scripts_root = '/' + _scripts_root.split('/').slice(3).join('/');}


    window.aui = {

        ///////////////////////////////////////////////////////////////////////
        // >>>>>>>>>>>>>>>>>>>>> C O R E <<<<<<<<<<<<<<<<<<<<<<<
        ///////////////////////////////////////////////////////////////////////

        error_style: "background: #f6f6f6; color: green",
        log_style: "background: #f6f6f6; color: #2ca6f8",

        settings: {
            "animate_header": true,
            "disable_mobile_dropdown": false,
            "footer": true,
            "header": true,
            "menu_breakpoint": 1080
        },

        request_method: $.ajax, // used to get templates only (no side effects or sensitive data) so should be csrf safe

        scroll_element: "#aui-content",


        init: function(methods) {

            window.aui.scripts_root = _scripts_root;
            window.aui.templates_root = window.aui.scripts_root.split('/').slice(0, -1).join('/') + '/templates';

            if ($(aui.scroll_element).length) {
                $("body").addClass("aui-scroll-wrapper");
            }

            // add body classes

            if (window.navigator.userAgent.indexOf("Mac OS X 10_6") > -1) {
                document.getElementsByTagName('body')[0].className+=' aui-custom-scrollbar'
            }
            if (window.devices.desktop) { document.getElementsByTagName('body')[0].className+=' aui-device-desktop' }
            else if (window.devices.tablet) { document.getElementsByTagName('body')[0].className+=' aui-device-tablet' }
            else if (window.devices.phone) { document.getElementsByTagName('body')[0].className+=' aui-device-phone' }
            if (window.devices.handheld) { document.getElementsByTagName('body')[0].className+=' aui-device-handheld' }

            if ($("body").attr("style") && !$("body:visible").length) {
                //$("body").removeAttr("style");
                document.body.style.display = "";
            }

            if (window.aui.meta.ie === 8) { document.getElementsByTagName('body')[0].className+=' aui-browser-ie-8' }
            if (window.aui.meta.ie === 9) { document.getElementsByTagName('body')[0].className+=' aui-browser-ie-9' }

            // add elements

            // if (!$(".aui-panel").length) {
            //     var panel_element = "<div class='aui-panel'></div>";
            //     if ($("#big-wrapper").length) {
            //         $("#big-wrapper").prepend(panel_element);
            //     } else {
            //         $("#aui-body").prepend(panel_element);
            //     }
            // }

            window.aui.dom_filter.init();

            window.aui.swipe();

            //window.aui.prevent_zoom_on_input();

            window.aui._resize();
            window.aui._scroll();

            if (window.aui.settings.animate_header) {
                window.aui.animate_header.init({
                    scrollPosition: 1,
                    effect: "resize"
                });
            }

            window.aui.handlebars_helpers();

            window.aui.menu.init();

            // window.aui.selectable.add_selectables();

            // window.aui.lazy_load();

            window.aui.event_handlers();

            // window.aui.slide.init();

            // window.aui.accordion.add();

            function getAndroidVersion(ua) {
                var ua = ua || navigator.userAgent;
                var match = ua.match(/Android\s([0-9\.]*)/);
                return match ? match[1] : false;
            };

            if (parseInt(getAndroidVersion()) < 3) {
                $("body").addClass("os-old-android");
                window.aui.lazy_load(true);
            }


            if (window.aui.view === "custom") {
                window.aui.preload_template(window.aui.templates_root + "/grids/grid.html");
            }

            window.aui.refresh();

            $(document).trigger("aui-init");

            // Initiate feather icons - https://feathericons.com/
            if (!!window.page_settings.homepage_and_upgrades) {
                feather.replace();
            }

        },

        stick_element: function (sticky_anchors, scroll_element) {
            var that = this;
            sticky_anchors.each(function() {
                var anchor = $(this),
                    anchor_position = that.element_position(anchor).top.top_edge,
                    anchor_previous_position = parseInt(anchor.attr('data-previous-position') || anchor_position),
                    sticky_group = anchor.data('aui-sticky-anchor'),
                    sticky_elements = $('[data-aui-sticky="'+sticky_group+'"]');

                sticky_elements.each(function() {
                    if ($(this).is(':visible')) {
                        var position = that.element_position($(this)).top.top_edge,
                            position_difference = (anchor_position - (anchor_previous_position || anchor_position));

                        $(this).css('top', (position + position_difference) + 'px');
                        anchor.attr('data-previous-position', anchor_position);
                    }
                });


            });
        },

        meta: {
            window_width: $(window).width(),
            window_height: $(window).height(),
            scroll_position: 0,
            cursorX: 0,
            cursorY: 0,
            ie: (function(){

                // little script taken from here: https://gist.github.com/padolsey/527683

                // ----------------------------------------------------------
                // A short snippet for detecting versions of IE in JavaScript
                // without resorting to user-agent sniffing
                // ----------------------------------------------------------
                // If you're not in IE (or IE version is less than 5) then:
                // ie === undefined
                // If you're in IE (>=5) then you can determine which version:
                // ie === 7; // IE7
                // Thus, to detect IE:
                // if (ie) {}
                // And to detect the version:
                // ie === 6 // IE6
                // ie > 7 // IE8, IE9 ...
                // ie < 9 // Anything less than IE9
                // ----------------------------------------------------------

                // UPDATE: Now using Live NodeList idea from @jdalton

                var undef,
                    v = 3,
                    div = document.createElement('div'),
                    all = div.getElementsByTagName('i');

                while (
                    div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
                    all[0]
                );

                return v > 4 ? v : undef;

            }()),
            browser: $("body").hasClass("aui-browser-ie-8") ? "IE-8" : false
        },

        logging: false,
        enable_error_logging: true,

        log: function() {
            window.aui.utils.log(this.logging, arguments);
        },

        error: function(message) {
            console.log("%c aui error:" + message, window.aui.error_style);
        },

        refresh: function() {
            for (var key in window.aui.refresh_functions) {
                window.aui.refresh_functions[key]();
            }
        },

        refresh_functions: {
            scrollbar_fix: function() {
                //scrollbar fix

                var aui_wrapper = $(aui.scroll_element);
                var aui_wrapper_width = aui_wrapper.width();

                aui_wrapper.append("<div id='aui-width-element'></div>");

                window.aui.scrollbar_width = aui_wrapper_width - $("#aui-width-element").width();

                if($("#aui-head").length > 0) {

                    $("#aui-head").css("right", "").css({
                        "right": aui_wrapper_width - $("#aui-width-element").width() + "px"
                    });
                }

                var scrollbar_width = aui_wrapper_width - $("#aui-width-element").width() + "px";

                $("body").append("<style>#aui-body .aui-scrollbar-right-fix, .aui-sticky-footer-true #aui-footer { right: "+scrollbar_width+"}</style>");

                if(window.aui.header && window.aui.header.header_animation === "scrollover") {
                    $("#aui-custom-header-container").css({
                        "right": $("#aui-custom-header-container").width() - $("#aui-width-element").width() + "px"
                    });
                }

                $("#aui-width-element").remove();
            }
        },

        _resize: function() {
            var debounced_function = window.aui.utils.debounce(function() {

                // lazy_load, in case image positions shifted
                window.aui.lazy_load();

                // panel resize function
                //window.aui.panel.resize();

            }, 200);

            var frequent_update = window.aui.utils.debounce(function() {

                // set window
                window.aui.meta.window_width = $(window).width();
                window.aui.meta.window_height = $(window).height();

            }, 10);

            var debounced_function_trigger_first = window.aui.utils.debounce(function() {
                // reposition stickybox
                window.aui.stickybox.resize();
            }, 100, true);

            $(window).resize(function(){
                frequent_update();
                debounced_function();
                debounced_function_trigger_first();
            });
        },

        _scroll: function() {

            var debounced_function = window.aui.utils.debounce(function() {
                window.aui.lazy_load();
            }, 20);

            $(aui.scroll_element).scroll(function(event) {
                // set scroll postion
                window.aui.meta.scroll_position = $(this).scrollTop();
                if (window.aui.meta.scroll_position > 0) {
                    $('body').addClass('aui-scroll-element-scrolled');
                } else {
                    $('body').removeClass('aui-scroll-element-scrolled');
                }
                debounced_function();

            });
        },

        event_handlers: function() {

            var that = this;

            // TOOLTIP
            var show_tooltip = window.aui.utils.debounce(function(id, tooltip, text, element) {
                if (element.is(':hover')) {
                    if (!tooltip.length) {
                        $('body').append('<div id="aui-tooltip-'+id+'" class="aui-tooltip aui-active">'+text+'</div>');
                        tooltip = $("#aui-tooltip-"+id);
                        tooltip.css({
                            top: window.aui.meta.cursorY - tooltip.height() + 'px',
                            left: window.aui.meta.cursorX+'px'
                        });
                    } else {
                        tooltip.addClass('aui-active').css({
                            top: window.aui.meta.cursorY - tooltip.height() + 'px',
                            left: window.aui.meta.cursorX+'px'
                        });
                    }
                }
            });
            $('body').on('mousemove', '[data-aui-tooltip]', function(event) {
                var text = h.html_encode($(this).data('aui-tooltip'));

                if (!text || window.devices.handheld) {
                    return;
                }

                var element = $(this),
                    id = $(this).attr('data-aui-tooltip-id') || window.aui.utils.get_uid(),
                    tooltip = $("#aui-tooltip-"+id),
                    delay = 900;

                $(this).attr('data-aui-tooltip-id', id);
                window.setTimeout(function() {
                    show_tooltip(id, tooltip, text, element);
                }, delay);
            }).on('mouseout', '[data-aui-tooltip]', function(event) {
                var id = $(this).data('aui-tooltip-id');
                $("#aui-tooltip-"+id).removeClass("aui-active");
            });
            $('body').on('mousemove', function() {
                $('.aui-tooltip').removeClass('aui-active');
            });

            // stickyBox hover tooltip
            $('body').on({
                    mouseenter: function() {
                        var content = $(this).attr("data-stickybox-tooltip");
                        $(this).stickyBox(content, {
                            width: '300',
                            z_index: 1300,
                            padding: '15px',
                            halign: "right",
                        });
                    },
                    mouseleave: function() {
                        window.aui.stickybox.close();
                    }
                }, '[data-stickybox-tooltip]'
            );

            $('body').on('click.aui.list_input', '.aui-list-input', function(event) {
                var id = window.aui.utils.get_uid(),
                    input = $(this),
                    list = $(this).data('list'),
                    element_width = $(this).outerWidth(),
                    align = $(this).hasClass('aui-text-align-right') ? 'right' : 'left',
                    list_template = '<div class="aui-list-input-list" style="width: {{width}}px;">{{#each list}}<button data-list-input-id="{{../id}}" style=" text-align: {{../align}};">{{this}}</button>{{/each}}</div>';

                $(this).attr('data-list-input-id', id);
                $(this).select();
                $('.aui-list-input-list').remove();
                $(this).after(Handlebars.compile(list_template)({list: list, id: id, width: element_width, align: align}));

                $('.aui-list-input-list [data-list-input-id="'+id+'"]').off('click.list_input.'+id).on('click.list_input.'+id, function() {
                    input.val($(this).text()).trigger('change');
                    $('.aui-list-input-list').remove();
                });

            });
            $('body').on('click.aui.list_input_remove', function(event) {
                if (!$(event.target).closest('.aui-list-input-list').length && !$(event.target).closest('.aui-list-input').length) {
                    $('.aui-list-input-list').remove();
                }
            });

            $('body').on('change', '.percentage_max_100', function() {
                var elem = $(this);
                if (window.h.parse_float(elem.val()) > 100) {
                    elem.val(100);
                }
            });

            // LISTEN TO ALL SCROLL EVENTS
            $(document).off('scroll.aui.all').on('scroll.aui.all', '*', function() {
                var sticky_anchors = $(this).find('[data-aui-sticky-anchor]');
                if (sticky_anchors.length) {
                    that.stick_element(sticky_anchors, $(this));
                }
            });

            document.body.addEventListener('scroll', function(event){
                var sticky_anchors = $(event.target).find('[data-aui-sticky-anchor]');
                if (sticky_anchors.length) {
                    that.stick_element(sticky_anchors, $(event.target));
                }
            }, true);




            // META CURSOR POSITION
            $(window).off("mousemove.meta_cursor").on("mousemove.meta_cursor", function(event) {
                window.aui.meta.cursorX = event.pageX;
                window.aui.meta.cursorY = event.pageY;
            });

            // KEYDOWN LISTENER
            $(document).off("keydown.shortcut").on("keydown.shortcut", function(event) {
                $(document).trigger("keyboard_shortcut", [event]);
                if (event.metaKey) {
                    $(document).trigger("meta_key", [event]);
                }
            });

            // KEYUP LISTENER
            $(document).on("keyup", function(event) {
                if (event.keyCode === 9) {
                    var focus_element = document.activeElement,
                        offsets = {
                            top: $("#aui-head").height(),
                            bottom: $("#aui-footer").height()
                        };
                    if (window.aui.element_is_offscreen(focus_element, offsets)) {
                        window.aui.scroll_to_element(focus_element);
                    }
                }
            });


            // text inputs
            $('body').on('change.aui.input.text', '.aui-text-input-minimal input', function() {
                if ($(this).val()) {
                    $(this).addClass('has-value');
                } else {
                    $(this).removeClass('has-value');
                }
            });


            $(window.aui.scroll_element).scroll(function (event) {
                if ($('.aui-banner').length) {
                    var percentage = $(this).scrollTop() * 100 / $('.aui-banner').height();

                    $('.aui-banner.aui-banner-parallax').css('background-position-y', 50 - $(this).scrollTop() * 0.01 + '%');
                    $('.aui-banner-content').css('opacity', 1 - 2 / 100 * percentage);
                }
            });




            $(".aui-mobile-nav-btn").click(function() {
                window.aui.pane.load({
                    content: $("#aui-mobile-nav").html(),
                    //animation: "push",
                    squeeze_content: false,
                    position: "right",
                    box_width: '300px',
                    css_class: "aui-menu-panel",
                    no_padding: true,
                    //close_button: true,
                    buttons: false,
                    animation: "slide-left", //"slide-left-bounce",
                    animation_speed_in: 300,
                    animation_speed_out: 600,
                    on_load: function () {
                        $("body").addClass("aui-mobile-menu-active");
                    },
                    on_before_close: function () {
                        $("body").removeClass("aui-mobile-menu-active");
                    }
                });
            });










            // JOSEF: counter for dragenter event to remove the dragover class precisely when we leave the window
            //        events modified accordingly
            var dragenter_counter = 0;

            $("body").on("click", "[data-accordion-toggle]", function(event) {
                event.preventDefault();
                var accordion_id = $(this).closest("[data-accordion]").data("accordion");
                var id = null;

                id = $(this).closest("[data-accordion]").data("accordion-id");

                window.aui.accordion.open(accordion_id, id, {
                    slide_speed: 200
                });
            });


            // JOSEF: added events to change the style of the dropzone

            $(".aui-dropzone").on("dragenter", function(event) {
                event.preventDefault();
                dragenter_counter++;
                $(this).addClass("aui-dropzone-dragover");
            });

            $(".aui-dropzone").on("drop", function(event) {
                event.preventDefault();
                $(this).removeClass("aui-dropzone-dragover");
                dragenter_counter = 0;
            });

            $(".aui-dropzone").on("dragleave", function(event) {
                event.preventDefault();
                dragenter_counter--;
                $(this).removeClass("aui-dropzone-dragover");
            });

            // JOSEF: added event handler for the dropzone click to upload files
            //        and overlay for IE; form action to be configured!

            $('body').on("click", ".aui-clickzone", function(event) {
                if ($("body").hasClass("aui-browser-ie-old")) {
                    var content = '';
                    content += '<div id="aui-ie-fileupload">';
                    content += '<form id="aui-ie-uploadform"';
                    // JOSEF: in the next row should be appropriate (and use dependent) form action set
                    content += ' action="/peter/file-upload-widget/receive/iframe/"';
                    content += ' method="POST"';
                    content += ' encoding="multipart/form-data"';
                    content += ' enctype="multipart/form-data"';
                    content += ' target="aui-ie-postiframe"';
                    content += '>';
                    content += '<div style="width: 240px; max-height: 100px; border: 1px solid silver; overflow: auto;">';
                    // JOSEF: adjust the number of file inputs appropriately
                    //        change input name/assign different names to potentially ease the file handling in the backend
                    for (var i = 0; i < 20; i++) {
                        content += '<input id="aui-ie-userfile" name="userfile" type="file">';
                    }

                    content += '</div>';
                    content += '<input type="submit" value="Upload Files" id="aui-ie-fileupload-submit" style="position: relative; top: 10px;">';
                    content += '</form>';
                    content += '</div>';
                    aui.overlay_box.load({
                        content: content,
                        buttons: [{
                            'label': 'Close',
                            callback: function(){
                                aui.overlay_box.close();
                            }
                        }]
                    });
                }
                else {
                    $(this).next().trigger("click");
                }
            });
        },

        handlebars_helpers: function() {

            // output json data
            Handlebars.registerHelper('json', function(obj) {
                return JSON.stringify(obj);
            });

            Handlebars.registerHelper('get_index', function(index, index_offset) {
                // used for pagination
                var offset_index = (parseInt(index_offset) || 0) + parseInt(index) + 1;

                return offset_index;
            });

            Handlebars.registerHelper('get_obj_prop', function(obj, key) {
                return obj[key];
            });

            Handlebars.registerHelper('get_obj_prop_text', function(obj, key) {
                return obj[key] ? obj[key].replace(/<[^>]+>/g, '') : '';
            });
        },
        compiled_templates: {},

        convert_to_cacheable_url: function(url) {
            /* if a url starts with /lib and does not beging with the static_root
             * url (from window.page_settings.static_root, used for caching at
             * app.artlogic.net), rewrite it so that it does!
             */
            if (window.page_settings && window.page_settings.static_root &&
                url && url.indexOf('/lib/') == 0 &&
                url.indexOf(window.page_settings.static_root) != 0) {
                var url_segs = url.split('/');
                url_segs.shift(); // remove first, empty, segment
                url_segs.shift(); // remove 'lib'
                url = window.page_settings.static_root + '/' + url_segs.join('/');
                return url;
            } else {
                return url;
            }
        },

        preload_template: function(template_url, callback, callback_options) {
            /* see preload_templates() - this is a convenience function which preloads
             * a single template url.
             */
            template_url = window.aui.convert_to_cacheable_url(template_url);
            return $.when.apply(null, window.aui.preload_templates([template_url], callback, callback_options));
        },

        preload_templates: function(template_urls, callback, callback_options) {
            /* given a list of template urls, pre-load them, adding them to
             * the page, then run the callback with (optional) callback_options.
             */
            if (!$('#aui-loaded-templates').length) {
                $('body').append('<div id="aui-loaded-templates" style="display: none;"></div>');
            }
            var promises = [];
            var uid = window.aui.utils.generate_uid();
            if (!window.aui.precached_templates_counters) {
                window.aui.precached_templates_counters = {};
            }
            if (!window.aui.precached_template_urls_requested) {
                window.aui.precached_template_urls_requested = {};
            }
            if (!window.aui.precache_templates_url_map) {
                /* to view an object containing all precached templates IDs and
                 * their origin URLs in the console, use:
                 * JSON.stringify(window.aui.precache_templates_url_map);
                 */
                window.aui.precache_templates_url_map = {};
            }
            window.aui.precached_templates_counters[uid] = template_urls.length;
            var template_url, template_url_id, template_url_previously_requested;
            var received = 0;
            for (var i = 0; i < template_urls.length; i ++) {
                template_url = template_urls[i];
                template_url_id = 'aui-template-' + window.aui.utils.one_way_hash(template_url);
                template_url_previously_requested = (window.aui.precached_template_urls_requested[template_url_id]) ? true : false;

                promises[i] = $.Deferred();
                var index = i;


                if (!template_url_previously_requested) {

                    window.aui.log('preload_templates.ajax()', template_url, template_url_id, template_url_previously_requested);
                    window.aui.request_method({
                        url: template_url,
                        method: "GET",
                        dataType: "html",
                        success: function(html) {
                            /* check if there are any script tags in the html. As templates are always
                             * comprised of script tags we can prevent templates being loaded to the page
                             * unless actual templates exist...
                             */
                            var html_obj = $('<div>' + html + '</div>'); // http://stackoverflow.com/questions/17672707/select-input-from-in-memory-html-in-jquery : 'your code would work if you wrapped the input in another tag...'
                            var scripts = $('script', html_obj);
                            if (!scripts.length) {
                                promises[index].reject();
                                console.log('WARNING: no html templates (script tags) found at ' + template_url + ' - no templates were added to the page.');
                            } else {
                                // check again to see if templates are previously loaded (ajax delay)
                                var template_url_previously_requested = $('#' + template_url_id).length > 0;
                                if (!template_url_previously_requested) {
                                    received ++;
                                    html_obj = $('<div>' + html + '</div>');
                                    window.aui.precache_templates_url_map[$('script', html_obj).attr('id')] = template_url;
                                    $('#aui-loaded-templates').append('<div data-template_url="' + template_url + '">' + html + '</div>');
                                    var current_template_id;
                                    if ($(html).length) {
                                        $(html).each(function() {
                                            current_template_id = $(this).attr("id");
                                            if ($(this).html()) {
                                                window.aui.compiled_templates[current_template_id] = Handlebars.compile($(this).html());
                                                Handlebars.registerPartial(current_template_id, window.aui.compiled_templates[current_template_id]);
                                            }
                                        });

                                        if ($(html).length === 1) {
                                            current_template_id = $(html).attr("id");
                                        }
                                    }

                                    window.aui.log('[preload_templates] received', received, window.aui.precached_templates_counters[uid]);
                                    if (received == window.aui.precached_templates_counters[uid]) {
                                        window.aui.log('[preload_templates] calling preload_templates callback()');
                                        if (window.aui.utils.is_function(callback)) {
                                            callback(callback_options);
                                        }
                                        promises[index].resolve(window.aui.compiled_templates[current_template_id]);
                                        window.aui.precached_template_urls_requested[template_url_id] = {
                                            url: template_url,
                                            requested: true,
                                            received: false
                                        };
                                    }
                                }
                            }
                        },
                        error: function(result) {
                            console.log('failed to load template at: ' + template_url);
                            promises[index].reject();
                            window.aui.overlay_box.load({title: 'Sorry - something went wrong.', content: "<p>An error occurred loading a " +
                                "template object.</p><p>If this problem persists, please " +
                                "contact technical support with details of this error, the page you were on " +
                                "and what you were doing at the time.", box_width: "480px"});
                        }
                    });
                } else {
                    promises[i].resolve();
                    if (window.aui.utils.is_function(callback)) {
                        callback(callback_options);
                    }
                }
            }
            return promises;
        },

        ///////////////////////////////////////////////////////////////////////
        // >>>>>>>>>>>>>>>>>>>>> H E L P E R S <<<<<<<<<<<<<<<<<<<<<<<
        ///////////////////////////////////////////////////////////////////////

        element_scrolls: function(element) {
            /*
             * Check if element scrolls
             *
             */

            if ((element || []).length) {
                if (element[0].scrollHeight > element[0].clientHeight) {
                    return true;
                }
            }

            return false;
        },

        prevent_page_scroll: function(elems) {

            // prevent scrolling on specfied elements from scrolling the page
            var elements = $(elems);
            if (elements.length) {
                var last_scroll_top = 0,
                    event_prevent = false,
                    wrapper_scrolled = false;

                var reset_event_prevent = window.aui.utils.debounce(function() {
                    event_prevent = false;
                }, 10);

                var reset_wrapper_scrolled = window.aui.utils.debounce(function() {
                    wrapper_scrolled = true;
                }, 10);

                elements.off("mousewheel DOMMouseScroll");
                elements.on("mousewheel DOMMouseScroll", function(event) {
                    if (aui.element_scrolls($(this))) {
                        event.stopImmediatePropagation();

                        var current_scroll_top = $(this).scrollTop(),
                            element_height = $(this).outerHeight(),
                            element_scroll_height = $(this)[0].scrollHeight,
                            delta = event.originalEvent.wheelDelta || - event.originalEvent.detail;

                        if (delta < 0) {
                            // scroll down
                            if (element_height == element_scroll_height - current_scroll_top) {
                                event.preventDefault();
                                event_prevent = true;
                                reset_event_prevent();
                            }
                        } else {
                            // scroll up
                            if (current_scroll_top <= 0) {
                                event.preventDefault();
                                event_prevent = true;
                                reset_event_prevent();
                            }
                        }
                        last_scroll_top = current_scroll_top;
                        wrapper_scrolled = false;
                    }
                });

                $(aui.scroll_element).scroll(function() {
                    wrapper_scrolled = true;
                });

                $(aui.scroll_element).on("mousewheel DOMMouseScroll", function(event) {
                    if (!wrapper_scrolled || event_prevent) {
                        event.preventDefault();
                        reset_wrapper_scrolled();
                    }
                });
            }
        },


        ///////////////////////////////////////////////////////////////////////
        // >>>>>>>>>>>>>>>>>>>>> M O D U L E S <<<<<<<<<<<<<<<<<<<<<<<
        ///////////////////////////////////////////////////////////////////////

        /*
         * TODO: Each module should work without any required markup (like the aui-content etc.)
         *
         *
         *
         */


        overlay_box: {

            /*
             * title: String, displayed as a title at the top of the overlay box
             *
             * include_header: set to false to remove the header
             *      (default: true)
             *
             * content: String of html or an array of html strings. Array will be displayed as grid.
             *
             * id: Pass in a unique id to create a second or multiple overlay box or boxes. Leaving it blank
             *     will create a 'default' box whose content will be overwritten if the load method
             *     is called again without an id.
             *
             * box_width: Width of the overlay box
             *
             * box_height: Height of the overlay box
             *
             * no_padding: Removes the padding of the the overlay box if set to true
             *
             * text_align: text align of in the overlay box (left, right or center)
             *
             * button_align: button alignment (left, right or center)
             *
             * callback: function to be called when the overlay_box is rendered
             *
             * buttons: Add an array of button objects to the overlay box
             *
             *     label: Label displayed on button
             *
             *     css_class: Adds a class to the button
             *
             *     callback: Click event handler for the button
             *
             *     cancel: Set false to prevent button click closing overlay box, otherwise defaults to true
             *
             *     halign: Align a button to the left, right or centre
             *
             *
             * Examples:
             *
             * Large image view
             *
             * window.aui.overlay_box.load({
             *     no_border: true,
             *     buttons: false,
             *     content: '<img src="http://upload.wikimedia.org/wikipedia/commons/3/36/Hopetoun_falls.jpg">'
             * })
             *
             *
             *
            */
            settings: {
                title: false,
                include_header: true,
                panel_header: '',
                title_class: false,
                title_size: 'medium',
                content: false,
                id: 'aui-overlay-default',
                box_width: false,
                box_height: false,
                fullscreen: false,
                css_class: false,
                text_align: "left",
                button_align: "center",
                cover_background: true,
                blur_background: false,
                no_padding: false,
                callback: false,
                on_load: false,
                on_close: false,
                on_before_close: false,
                remove_on_close: true,
                callback_before_animation: false,
                animation: "slide-up",
                animation_out: false,
                animation_speed_in: 400,
                animation_speed_out: 400,
                transition_speed: 300,
                draggable: false,
                close_on_click_outside: true,
                scroll_height: "auto",
                container_element: "body",
                show_close_button: false,
                close_button_class: "",
                close_button_icon_class: "aui-icon-cross",
                close_on_esc: true,
                buttons: [
                    {
                        label: "OK",
                        data_attributes: {
                            cy: "confirm-btn"
                        },
                    }
                ],
                button_default_class: "aui-overlay-button aui-button-extra-round",
                data_cy: "",
            },

            boxes: {},

            get_html: function(settings) {
                var classes_to_add = this.get_classes(settings).add,
                    content = this.get_content(settings);


                var hidden_title_element = $('<div>' + content + '</div>').find("#overlaybox-heading"),
                    hidden_title = hidden_title_element.length ? hidden_title_element.val() : "",
                    hidden_title_class = hidden_title_element.length ? hidden_title_element.attr("class") : false,
                    title_class = function() {
                        if (hidden_title_class && hidden_title_class !== "") {
                            return hidden_title_class;
                        } else {
                            return settings.title_class;
                        }
                    }(),
                    title = hidden_title || settings.title;


                var styles = "";
                if (settings.z_index) {
                    styles += "z-index: " + settings.z_index;
                }
                var data_cy_attr = settings.data_cy ? "data-cy='" + settings.data_cy + "'" : "";
                
                var html = "<div class='aui-overlay-box " + classes_to_add + "' id='" + settings.id + "' style='"+styles+"'" + data_cy_attr + "><div class='aui-overlay-box-content-wrapper'>" + settings.panel_header;
                html += this.get_inner_box_html(settings);

                html += "</div>";

                var blur_background_class = "";
                if (settings.blur_background) {
                    blur_background_class = "aui-overlay-box-blur";
                }

                //$("body").addClass("aui-overlay-box-active " + blur_background_class);

                return html;
            },

            get_inner_box_html: function(settings) {
                var content = this.get_content(settings),
                    title = this.get_hidden_title(content) || settings.title,
                    title_class = this.get_hidden_title_class(content) || settings.title_class,
                    header_html = "",
                    buttons_html = "",
                    inner_box_html = "";

                // HEADER HTML
                header_html = "<div class='aui-overlay-box-header'>";
                if (title) {
                    header_html += "<div class='aui-overlay-box-title " + (title_class ? title_class : "") + "'>" + title + "</div>";
                }
                if (settings.show_close_button) {
                    header_html += "<button class='aui-overlay-close-btn "+settings.close_button_class+"' data-cy='overlay-close-btn'><i class='"+settings.close_button_icon_class+"'></i></button>";
                }
                header_html += "</div>";
                // BUTTONS HTML
                if (settings.buttons) {
                    buttons_html = this.get_buttons_html(settings.buttons);
                }
                // FULL HTML
                if (settings.include_header || false) {
                    inner_box_html += header_html;
                }
                inner_box_html += '<div class="aui-overlay-box-content">' + content + '</div>' + buttons_html;

                return inner_box_html;
            },

            get_hidden_title: function(content) {
                var hidden_title_element = $('<div>' + content + '</div>').find("#overlaybox-heading"),
                    hidden_title = hidden_title_element.length ? hidden_title_element.val() : "";

                return hidden_title;
            },
            get_hidden_title_class: function(content) {
                var hidden_title_element = $('<div>' + content + '</div>').find("#overlaybox-heading"),
                    hidden_title_class = hidden_title_element.length ? hidden_title_element.attr("class") : false;

                return hidden_title_class;
            },

            add_html_to_dom: function(settings) {
                //var _public_settings = window.aui.overlay_box.settings;
                var html = this.get_html(settings);

                $(settings.container_element).append($(html).css({
                    "display": "block",
                    "opacity": "1"
                }));
            },

            add_event_listeners: function(settings) {
                var that = this;
                // events
                if (settings.buttons) {
                    $.each(settings.buttons, function(index, value) {
                        var element = $("#aui-overlay-box-button-" + value.id);
                        element.off("click.olb_button_click").on("click.olb_button_click", function(event) {
                            if (value.callback) {
                                value.callback(element, event);
                                if (value.cancel) {
                                    window.aui.overlay_box.dismiss(settings.id);
                                }
                            } else {
                                if (value.cancel !== false) {
                                    window.aui.overlay_box.dismiss(settings.id);
                                }
                            }
                        });
                    });
                }

                /** keep track of element focus for when user clicks outside the box */
                $('.aui-overlay-box').off('keyup.focus_tracker').on('keyup.focus_tracker', function(e) {
                    if (e.which==9) {
                        window.aui.overlay_box.boxes[settings.id].focus = e.target;
                    }
                });


                // TODO: this probably won't work with multiple boxes
                $("body").off("click.olb_close." + settings.id).on("click.olb_close." + settings.id, function(event) {
                        var current_settings = that.get_settings(settings.id);
                        if (settings.close_on_click_outside && window.aui.overlay_box.state(settings.id) && !current_settings.is_loading) {
                            var conditions = $.contains(document, $(event.target)[0]) && !$(event.target).closest(".aui-overlay-box-content-wrapper").length && !$(event.target).closest(".aui-stickybox").length && !$(event.target).closest(".popline").length;
                            if (conditions) {
                                window.aui.overlay_box.dismiss(settings.id);
                            }
                        }
                    });

                $("#" + settings.id + " .aui-overlay-close-btn")
                    .off("click.olb_close")
                    .on("click.olb_close", function(event) {
                        var id = $(this).closest(".aui-overlay-box").attr("id"),
                            settings = that.get_settings(id);

                        if (window.aui.utils.is_function(settings.close_button_method)) {
                            settings.close_button_method(settings);
                        } else {
                            if (settings && settings.state == "inactive") {
                                window.aui.overlay_box.load(settings);
                            } else {
                                window.aui.overlay_box.dismiss(settings.id);
                            }
                        }
                    });

                /** suppress tab keypresses outside the overlay, if overlay is modal - only run if this is the first popup */
                if (settings.cover_background && $('.aui-overlay-box').length==1) {
                    $(document).off('keydown.outside_popup').on('keydown.outside_popup', function(e) {
                        if (e.which == 9 && $('#' + settings.id).find(e.target).length == 0) {
                            e.preventDefault();
                            /** focus inside popup */
                            window.aui.overlay_box.boxes[settings.id].focus = window.aui.overlay_box.boxes[settings.id].focus ||
                                    $("#" + settings.id).find('input, select, textarea, button, a')[0];
                            if (window.aui.overlay_box.boxes[settings.id].focus) {
                                window.aui.overlay_box.boxes[settings.id].focus.focus();
                            }
                        }
                    });
                }

                var debounced_scroll_height = window.aui.utils.debounce(function() {that.set_scroll_height(settings);}, 200),
                    debounced_check_scroll = window.aui.utils.debounce(function() {that.check_if_scrolls(settings);}, 200);

                $(window).on("resize", function() {
                    debounced_scroll_height();
                    debounced_check_scroll();
                });

                $("#" + settings.id).find(".aui-overlay-box-content").off("scroll.box").on("scroll.box", function() {
                    var scroll_position = $(this).scrollTop();
                    if (scroll_position > 5) {
                        $("#" + settings.id).addClass("aui-box-scrolled");
                    } else {
                        $("#" + settings.id).removeClass("aui-box-scrolled");
                    }
                });


                var shortcuts = [
                    {
                        name: 'aui_close_overlay_box-'+settings.id,
                        key_code: 27,
                        method: function() {
                            window.aui.overlay_box.close(settings.id);
                        },
                        condition: function() {
                            var active_room = $('body')[0].classList.contains('roomview-active');
                            return (window.aui.overlay_box.state(settings.id) && !active_room);
                        },
                        allow_for_popup: true
                    }

                ];

                if (settings.close_on_esc) {
                    window.aui.keyboard_shortcut.set_keyboard_shortcuts(shortcuts);
                }

            },
            get_element: function(id) {
                return $("#" + id);
            },
            load: function(options) {

                /*
                 * This is the method that's called to open an overlay box
                 *
                 *
                 */

                var _public_settings = window.aui.overlay_box.settings;
                var settings = $.extend({}, _public_settings, options);
                var existing_settings = this.get_settings(settings.id);

                window.aui.overlay_box.boxes[settings.id] = settings;

                window.aui.utils.responsivise_settings(settings);



                // check if there's already an open overlay box
                if (existing_settings.state == "inactive") {
                    settings.is_loading = true;
                    this.animate(settings);
                } else if (this.state(settings.id)) {
                    this.transform(settings, existing_settings);
                    settings.state = "active";
                } else {
                    settings.is_loading = true;
                    this.add_html_to_dom(settings);
                    this.on_load(settings);
                    this.animate(settings);
                }

                return {
                    settings: settings,
                    element: $("#" + settings.id)
                }
            },
            on_load: function(settings) {

                // external dependencies
                var _is_function = window.aui.utils.is_function;

                // set the height of the scrollable area
                if (!settings.fullscreen) {
                    this.set_scroll_height(settings);
                }

                this.add_event_listeners(settings);

                settings.state = "active";

                if (_is_function(settings.callback)) {
                    settings.callback();
                }
                if (_is_function(settings.on_load)) {
                    settings.on_load();
                }

                if (settings.fullscreen) {
                    $("body").addClass("aui-overlay-box-fullscreen-active");
                }

                // make the box draggable
                if (settings.draggable) {
                    $("#" + settings.id).find(".aui-overlay-box-content-wrapper").draggable();
                }
                // removed - causes performance problems
                //this.check_if_scrolls(settings);

            },
            check_if_scrolls: function(settings) {
                var box = $("#" + settings.id);
                if (box.length) {
                    if (window.aui.element_scrolls(box.find(".aui-overlay-box-content"))) {
                        box.addClass("aui-box-scrolls");
                    } else {
                        box.removeClass("aui-box-scrolls");
                    }
                }
            },
            animate: function(settings) {

                var box = this.get_element(settings.id),
                    inner_box = box.find(".aui-overlay-box-content-wrapper"),
                    box_content = box.find(".aui-overlay-box-content, .aui-overlay-bottom, .aui-overlay-box-header"),
                    animation_speed_in_s = settings.animation_speed_in / 1000,
                    on_animation_end,
                    animation_end_promise = $.Deferred();

                var animation_element = settings.cover_background ? inner_box : box;

                box.removeClass("aui-box-inactive");

                //box.addClass("ob-before-animate");

                if (window.aui.utils.is_function(settings.on_before_animate)) {
                    settings.on_before_animate();
                }

                var keyframes = this.get_keyframes_in(settings);

                if (!$(".aui-box-dynamic-styles").length) {
                    var dynamic_styles = "<div class='aui-box-dynamic-styles'></div>"
                    $("body").append(dynamic_styles);
                }
                if (keyframes[settings.animation]) {
                    $(".aui-box-dynamic-styles").html("<style>"+keyframes[settings.animation]+"</style>");
                }

                animation_element.off('animationend.aui.box.animate_out');

                // animations
                switch (settings.animation) {
                    case "scale":
                        animation_element.css({
                            animation: "aui-overlay-box-scale " + animation_speed_in_s + "s ease"
                        });
                        $("body").append("<div class='aui-overlay-box-background-transition'><style>.aui-overlay-box:after {animation: aui-overlay-box-fade-in "+animation_speed_in_s+"s ease;}</style>");
                        break;
                    case "fade":
                        animation_element.css({
                            animation: "aui-overlay-box-fade-in " + animation_speed_in_s + "s ease"
                        });
                        break;
                    case "slide-up":
                        animation_element.css({
                            animation: "aui-overlay-box-slide-in-up " + animation_speed_in_s + "s ease"
                        });
                        break;
                    case "slide-down":
                        animation_element.css({
                            "transform": "translateY(-" + window.aui.meta.window_height + "px)"
                        });
                        break;
                    case "slide-left":
                        animation_element.css({
                            transform: "",
                            animation: "aui-overlay-box-slide-in-left " + animation_speed_in_s + "s ease"
                        });
                        break;
                    case "slide-left-bounce":
                        animation_element.css({
                            transform: "",
                            animation: "aui-overlay-box-slide-in-left-bounce " + animation_speed_in_s + "s ease"
                        });
                        break;
                    case "slide-right":
                        animation_element.css({
                            transform: "",
                            animation: "aui-overlay-box-slide-in-right " + animation_speed_in_s + "s ease"
                        });
                        break;
                }

                // on animate in event
                if (window.aui.utils.is_function(settings.on_animate_in)) {
                    settings.on_animate_in();
                }

                inner_box.css({
                    overflow: "",
                    width: settings.box_width ? settings.box_width : "",
                    height: settings.box_height ? settings.box_height : ""
                });

                on_animation_end = function () {
                    // after animation
                    $(".aui-overlay-box-background-transition").remove();
                    settings.state = "active";
                    settings.is_loading = undefined;
                    box.find(".aui-overlay-close-btn i").attr("class", settings.close_button_icon_class);
                    animation_element.css("animation", "");
                };

                animation_element.on('animationend.aui.box.animate_in', function(event) {
                    var animation_name = event.originalEvent.animationName || '';
                    if (animation_name.indexOf('aui-overlay-box-') > -1) {
                        animation_end_promise.resolve();
                    }
                });

                animation_end_promise.done(function() {
                    on_animation_end();
                });

                // window.setTimeout(function() {
                //     // after animation
                //     $(".aui-overlay-box-background-transition").remove();
                //     settings.state = "active";
                //     settings.is_loading = undefined;
                //     box.find(".aui-overlay-close-btn i").attr("class", settings.close_button_icon_class);
                //     animation_element.css("animation", "");
                // }, settings.animation_speed_in + 420);

            },
            get_keyframes_in: function(settings) {
                // animation styles
                var keyframes = {};
                keyframes['scale'] = "" +
                    "@keyframes aui-overlay-box-fade-in {" +
                        "0% { opacity: 0; }" +
                        "100% { opacity: 1; }" +
                    "}";

                keyframes['fade'] = "" +
                    "@keyframes aui-overlay-box-fade-in {" +
                        "0% { opacity: 0; }" +
                        "100% { opacity: 1; }" +
                    "}";

                keyframes['slide-up'] = "" +
                    "@keyframes aui-overlay-box-slide-in-up {" +
                        "0% { transform: translateY(" + window.aui.meta.window_height + "px" + "); opacity: 1; }" +
                        "100% { transform: translateY(0px); opacity: 1; }" +
                    "}";

                keyframes['slide-left'] = "" +
                    "@keyframes aui-overlay-box-slide-in-left {" +
                        "0% { transform: translate(" + (settings.box_width || (window.aui.meta.window_width + "px")) + ", 0px); }" +
                        "100% { transform: translate(0px, 0px); }" +
                    "}";

                keyframes['slide-right'] = "" +
                    "@keyframes aui-overlay-box-slide-in-right {" +
                        "0% { transform: translate(-" + window.aui.meta.window_width + "px, 0px); }" +
                        "100% { transform: translate(0px, 0px); }" +
                    "}";

                keyframes['slide-left-bounce'] = "" +
                    "@keyframes aui-overlay-box-slide-in-left-bounce {" +
                        "0% { transform: translate(" + window.aui.meta.window_width + "px, 0px); }" +
                        "60% { transform: translate(-10px, 0px); }" +
                        "100% { transform: translate(0px, 0px); }" +
                    "}";

                return keyframes;
            },
            get_keyframes_out: function(settings) {
                var keyframes = {};

                keyframes['fade'] = "" +
                    "@keyframes aui-overlay-box-fade-out {" +
                        "0% { opacity: 1; }" +
                        "100% { opacity: 0; }" +
                    "}";

                keyframes['slide-left'] = "" +
                    "@keyframes aui-overlay-box-slide-out-left {" +
                        "0% { transform: translate(0px, 0px); }" +
                        "100% { transform: translate(" + (settings.box_width || (window.aui.meta.window_width + "px")) + ", 0px); }" +
                    "}";

                keyframes['slide-right'] = "" +
                    "@keyframes aui-overlay-box-slide-out-right {" +
                        "0% { transform: translate(-" + window.aui.meta.window_width + "px, 0px); }" +
                        "100% { transform: translate(0px, 0px); }" +
                    "}";

                keyframes['slide-up'] = "" +
                    "@keyframes aui-overlay-box-slide-out-up {" +
                        "0% { transform: translateY(0px); }" +
                        "100% { transform: translateY(" + window.aui.meta.window_height + "px" + "); }" +
                    "}";

                keyframes['slide-down'] = "" +
                    "@keyframes aui-overlay-box-slide-out-down {" +
                        "0% { transform: translateY(0px); }" +
                        "100% { transform: translateY(" + window.aui.meta.window_height + "px" + "); }" +
                    "}";

                keyframes['slide-left-bounce'] = "" +
                    "@keyframes aui-overlay-box-slide-out-left-bounce {" +
                        "0% { transform: translate(0px, 0px); }" +
                        //"40% { transform: translate(-20px, 0px); }" +
                        "100% { transform: translate(" + (settings.box_width || (window.aui.meta.window_width + "px")) + ", 0px); }" +
                    "}";

                return keyframes;
            },
            get_settings: function(id) {
                return window.aui.overlay_box.boxes[id] || {};
            },
            dismiss: function(id) {
                var settings = this.get_settings(id),
                    element = this.get_element(id);

                this.close(settings.on_dismiss, element);
            },
            show: function(id) {
                var existing_settings = this.get_settings(id) || {};
                if (existing_settings.id && existing_settings.state !== "active") {
                    this.load(existing_settings);
                }
            },
            hide: function(callback, element) {
                this.close(callback, element, true);
            },
            close: function(callback, element, do_not_remove_on_close) {
                /**
                 *  There can be multiple simultaneous overlay boxes so an overlay box element, or an
                 *  element inside e.g. the target button of an event, should be passed in.
                 *  However in case of legacy calls we'll close the topmost overlay box, ie the last on the page.
                 */
                var box = element ? element.closest(".aui-overlay-box") : $('.aui-overlay-box:last'),
                    _is_function = window.aui.utils.is_function,
                    promise = $.Deferred(),
                    on_animation_end,
                    animation_end_promise = $.Deferred();

                if (box.length >= 1) {
                    var settings = window.aui.overlay_box.boxes[box.attr('id')];
                    if (!settings) {return}

                    var inner_box = box.find(".aui-overlay-box-content-wrapper"),
                        animation_speed_out_s = settings.animation_speed_out / 1000;

                    var animation_element = settings.cover_background ? inner_box : box;

                    if (!settings.animation_out) {
                        settings.animation_out = settings.animation;
                    }

                    var keyframes = this.get_keyframes_out(settings);

                    if (!$(".aui-box-dynamic-styles").length) {
                        var dynamic_styles = "<div class='aui-box-dynamic-styles'></div>"
                        $("body").append(dynamic_styles);
                    }

                    if (keyframes[settings.animation]) {
                        $(".aui-box-dynamic-styles").html("<style>"+keyframes[settings.animation_out]+"</style>");
                    }

                    switch (settings.animation_out) {
                        case "scale":
                            animation_element.css({
                                animation: "aui-overlay-box-scale-down " + animation_speed_out_s + "s ease"
                            });
                            $("body").append("<div class='aui-overlay-box-background-transition'><style>.aui-overlay-box:after {transition: opacity "+animation_speed_out_s+"s ease !important; opacity: 0 !important;}</style>");
                            break;
                        case "fade":
                            animation_element.css({
                                opacity: "0",
                                animation: "aui-overlay-box-fade-out " + animation_speed_out_s + "s ease",
                                //"transition": "opacity " + animation_speed_out_s + "s ease"
                            });
                            break;
                        case "slide-up":
                            animation_element.css({
                                animation: "aui-overlay-box-slide-out-up " + animation_speed_out_s + "s",
                                transform: "translateY(" + window.aui.meta.window_height + "px)"
                            });
                            break;
                        case "slide-down":
                            animation_element.css({
                                animation: "aui-overlay-box-slide-out-down " + animation_speed_out_s + "s",
                                transform: "translateY(" + window.aui.meta.window_height + "px)"
                            });
                            break;
                        case "slide-left":
                            animation_element.css({
                                animation: "aui-overlay-box-slide-out-left " + animation_speed_out_s + "s",
                                transform: "translate(" + (settings.box_width || (window.aui.meta.window_width + "px")) + ", 0px)"
                            });
                            break;
                        case "slide-left-bounce":
                            animation_element.css({
                                animation: "aui-overlay-box-slide-out-left-bounce " + animation_speed_out_s + "s",
                                transform: "translate(" + (settings.box_width || (window.aui.meta.window_width + "px")) + ", 0px)"
                            });
                            break;
                        case "slide-right":
                            animation_element.css({
                                animation: "aui-overlay-box-slide-out-right " + animation_speed_out_s + "s ease",
                                transform: "translate(-" + window.aui.meta.window_width + "px, 0px)"
                            });
                            break;
                    }

                    on_animation_end = function () {
                        if (!do_not_remove_on_close && settings.remove_on_close) {
                            box.remove();
                            settings.state = false;
                        } else {
                            settings.state = "inactive";
                            box.addClass("aui-box-inactive");
                            box.find(".aui-overlay-close-btn i").attr("class", settings.close_button_icon_class_inactive);
                        }
                        $(".aui-overlay-box-background-transition").remove();
                    };

                    animation_element.on('animationend.aui.box.animate_out', function(event) {
                        var animation_name = event.originalEvent.animationName || '';
                        if (animation_name.indexOf('aui-overlay-box-') > -1) {
                            animation_end_promise.resolve();
                        }
                    });

                    animation_end_promise.done(function() {
                        on_animation_end();
                    });

                    if (_is_function(settings.on_before_close)) {
                        settings.on_before_close();
                    }

                    window.setTimeout(function() {
                        promise.resolve();
                        if (window.aui.utils.is_function(callback)) {
                            callback();
                        }
                        if (_is_function(settings.on_close)) {
                            settings.on_close();
                        }


                    }, settings.animation_speed_out + 100);

                    if ($('.aui-overlay-box').length==1) {
                        $("body").removeClass("aui-overlay-box-active aui-overlay-box-blur aui-overlay-box-fullscreen-active");

                        /** remove custom keyboard event handlers */
                        $(document).off('keydown.outside_popup');
                        $('.aui-overlay-box').off('keyup.focus_tracker');
                    }

                    if (!do_not_remove_on_close && settings.remove_on_close) {
                        delete window.aui.overlay_box.boxes[settings.id];
                    }

                }

                return promise;
            },
            get_content: function(settings) {

                var new_content;

                if (settings.content) {
                    if($.isArray(settings.content)) {
                        new_content = window.aui.return_grid(settings.content);
                    } else {
                        new_content = settings.content;
                    }
                }

                return new_content;
            },
            get_buttons_html: function(buttons) {

                // dependencies
                var _public_settings = window.aui.overlay_box.settings;

                var html = "",
                    buttons_containers = {},
                    halign = {
                        left: "",
                        right: "",
                        center: ""
                    };

                // construct button html
                for (var x = 0; x < buttons.length; x++) {
                    if (buttons[x].condition !== false) {
                        var position = buttons[x].halign || "center";
                        buttons[x].id = window.aui.utils.get_uid();
                        var data_attributes = buttons[x].data_attributes || {};

                        if (!data_attributes.hasOwnProperty('cy')) {
                            data_attributes['cy'] = buttons[x].label?.replace(/\W/g, '').toLowerCase() + '-btn';
                        }

                        var data_attrs = Object.entries(data_attributes).reduce(function(all, [k,v]) { 
                            return all+'data-'+k+'="'+v+'" ';
                        }, "");
                        halign[position] += buttons[x].html || "<button id='aui-overlay-box-button-" + buttons[x].id + "' class='aui-overlay-box-button " +  (buttons[x].css_class || _public_settings.button_default_class) + "'" + (buttons[x].disabled ? 'disabled' : '') + " " + (data_attrs ? data_attrs : '') + ">" + buttons[x].label + "</button>";
                    }
                }

                // construct button group html
                for (var position in halign) {
                    if (halign.hasOwnProperty(position)) {
                        if (halign[position] !== "") {
                            buttons_containers[position] = "<div class='aui-overlay-box-buttons-" + position + "'>" + halign[position] + "</div>";
                        }
                    }
                }

                html += "<div class='aui-overlay-bottom aui-ob-button-columns-" + window.aui.utils.object_length(buttons_containers) + "'>";
                html += buttons_containers['left'] || '';
                html += buttons_containers['center'] || '';
                html += buttons_containers['right'] || '';
                html += "</div>";

                return html;
            },
            get_classes: function(settings) {
                /*
                 * Returns the classes to be added and removed from
                 * the overlay_box as an object
                 *
                 * TODO: This needs refactoring
                 *
                 */

                var classes_to_add = "",
                    classes_to_remove = "";

                if (settings.fullscreen) {
                    classes_to_add += "aui-overlay-box-fullscreen";
                }
                if (settings.text_align) {
                    classes_to_remove += "aui-text-align-left aui-text-align-center aui-text-align-right";
                    classes_to_add += " aui-text-align-" + settings.text_align;
                }
                if (settings.buttons) {
                    classes_to_add += " aui-overlay-has-buttons";
                }
                if (settings.no_padding) {
                    classes_to_add += " aui-borderless";
                } else {
                    classes_to_remove += " aui-borderless";
                }
                if (settings.cover_background) {
                    classes_to_add += " aui-overlay-cover-background";
                }
                if (settings.title_size) {
                    classes_to_remove += " title-size-large title-size-medium";
                    classes_to_add += " title-size-" + settings.title_size;
                }

                // positions
                if (settings.halign === "right") {
                    classes_to_add += " aui-overlay-halign-right";
                }
                if (settings.halign === "left") {
                    classes_to_add += " aui-overlay-halign-left";
                }
                if (settings.valign === "top") {
                    classes_to_add += " aui-overlay-valign-top";
                }
                if (settings.valign === "bottom") {
                    classes_to_add += " aui-overlay-valign-bottom";
                }

                if (settings.button_align) {
                    classes_to_remove += " aui-button-align-left aui-button-align-center aui-button-align-right";
                    classes_to_add += " aui-button-align-" + (settings.button_align || "none");
                }

                if (settings.box_height === "100%") {
                    classes_to_add += " aui-overlay-full-height";
                }

                if (settings.css_class) {
                    classes_to_remove += " " + settings.css_class;
                    classes_to_add += " " + settings.css_class;
                }

                classes_to_remove += " aui-box-scrolled";

                return { add: classes_to_add, remove: classes_to_remove };
            },
            transform: function(options, previous_settings) {
                // This method animates an existing box into the new box
                // TODO: Refactor!
                var _public_settings = window.aui.overlay_box.settings

                var settings = $.extend({}, _public_settings, options),
                    box = $("#" + settings.id),
                    inner_box = box.find(".aui-overlay-box-content-wrapper"),
                    classes_to_add = this.get_classes(settings).add,
                    classes_to_remove = this.get_classes(settings).remove,
                    new_inner_box_html = "";

                // add instance
                this.boxes[settings.id] = settings;

                new_inner_box_html = this.get_inner_box_html(settings);

                // CLONE THE INNER BOX TO CALCULATE DIMENSIONS
                var cloned_element = inner_box.clone();
                box.prepend(cloned_element);
                cloned_element.addClass("cloned").css({
                    opacity: "0",
                    height: settings.box_height || "",
                    width: settings.box_width || ""
                }).html(new_inner_box_html);
                this.set_scroll_height(settings);
                var calc_height = cloned_element.outerHeight();
                var calc_width = cloned_element.outerWidth();
                cloned_element.remove();


                if (!settings.transition_speed || (inner_box.outerWidth() == calc_width && inner_box.outerHeight() == calc_height)) {
                    // set classes
                    // window.setTimeout(function () {
                        box.removeClass(classes_to_remove);
                        box.removeClass(previous_settings.css_class);
                        box.addClass(classes_to_add);
                        // set content
                        inner_box.html(new_inner_box_html);

                        window.aui.overlay_box.on_load(settings);
                    // }, 0);
                } else {

                    // OVERFLOW HIDDEN TO PREVENT SCROLLBAR SHOWING DURING TRANSITION
                    inner_box.css("overflow", "hidden");
                    // SET CURRENT DIMENSIONS SO WE CAN ANIMATE TO THE NEW ONES
                    inner_box.css({
                        width: inner_box.outerWidth(),
                        height: inner_box.outerHeight()
                    });


                    // CLONE THE INNER BOX TO CALCULATE DIMENSIONS
                    // var cloned_element = inner_box.clone();
                    // box.prepend(cloned_element);
                    // cloned_element.addClass("cloned").css({
                    //     opacity: "0",
                    //     height: settings.box_height || "",
                    //     width: settings.box_width || ""
                    // }).html(new_inner_box_html);
                    // this.set_scroll_height(settings);
                    // var calc_height = cloned_element.outerHeight();
                    // var calc_width = cloned_element.outerWidth();
                    // cloned_element.remove();


                    //box.addClass("aui-before-enter");

                    var transition_speed_s = settings.transition_speed / 1000;

                    inner_box.css({
                        transition: "all "+transition_speed_s+"s ease"
                    });

                    var content_fade_out_speed = 0.2;
                    box.find(".aui-overlay-box-content, .aui-overlay-bottom, .aui-overlay-box-header").css({
                        opacity: "0",
                        //transition: "all "+content_fade_out_speed+"s ease"
                    });

                    //window.setTimeout(function () {

                        // SET NEW DIMENSIONS FOR ANIMATION
                        if (calc_width) {
                            inner_box.css("width", calc_width);
                        }
                        if (calc_height) {
                            inner_box.css("height", calc_height);
                        }

                        window.setTimeout(function() {

                            // set classes
                            box.removeClass(classes_to_remove);
                            box.removeClass(previous_settings.css_class);
                            box.addClass(classes_to_add);

                            // set content
                            inner_box.html(new_inner_box_html);

                            window.aui.overlay_box.on_load(settings);

                            box.find(".aui-overlay-box-content, .aui-overlay-bottom, .aui-overlay-box-header").css({
                                opacity: ""
                            });

                            // REMOVE DIMENSIONS TO ALLOW FOR RESIZE
                            if (!settings.box_height) {
                                inner_box.css("height", "");
                            }
                            if (!settings.box_width) {
                                inner_box.css("width", "");
                            }

                            // REMOVE OVERFLOW HIDDEN TO ENABLE SCROLLING
                            inner_box.css({
                                transition: "",
                                overflow: ""
                            });

                        }, settings.transition_speed);

                    //}, 200);

                }

            },
            get_scroll_height: function(settings, box_element) {
                var scroll_height;
                if (settings.scroll_height === "auto") {
                    var box = box_element || $("#" + settings.id),
                        inner_box = box.find(".aui-overlay-box-content-wrapper"),
                        footer_height = box.find(".aui-overlay-bottom").outerHeight() || 0,
                        header_height = box.find(".aui-overlay-box-header").css("position") !== "absolute" ? box.find(".aui-overlay-box-header").outerHeight() || 0 : 0,
                        overlay_box_padding = parseInt(inner_box.css("padding-top")) + parseInt(inner_box.css("padding-bottom")),
                        max_height_percent;

                    if (settings.fullscreen || settings.box_height == "100%") {
                        max_height_percent = 100;
                    } else if (typeof settings.box_height === 'string' && settings.box_height.indexOf('%') > -1) {
                        max_height_percent = parseInt(settings.box_height);
                    } else if (typeof settings.box_height === 'number' || typeof settings.box_height === 'string' && settings.box_height.indexOf('px') > -1) {
                        max_height_percent = parseInt(settings.box_height) / window.aui.meta.window_height * 100;
                    } else {
                        max_height_percent = 95;
                    }

                    scroll_height = window.aui.meta.window_height * max_height_percent/100 - footer_height - header_height - overlay_box_padding;
                } else {
                    scroll_height = settings.scroll_height;
                }

                return scroll_height;
            },
            set_scroll_height: function(settings) {
                var scroll_height = this.get_scroll_height(settings),
                    box = $("#" + settings.id),
                    content_element = box.find(".aui-overlay-box-content");

                if (scroll_height && content_element.css("max-height") !== scroll_height + "px") {
                    content_element.css({
                        "max-height": scroll_height + "px"
                    });
                }
            },
            state: function(id) {
                /** if no id passed in assume we're querying the topmost overlay box,
                 *  ie the past on the page */
                var selector = id ? '#' + id : '.aui-overlay-box:last:not(.aui-pane)',
                    settings = this.get_settings(id);

                //return settings.state;

                if ($(selector).is(":visible")) {
                    return true;
                } else {
                    return false;
                }
            }
        }, // (/OVERLAY BOX)


        pane: {
            settings: {
                id: "aui-panel-default",
                content: "",
                squeeze_content: true,
                squeeze_elements: "#big-wrapper",
                box_width: "500px",
                halign: "right",
                show_close_button: true,
                close_on_click_outside: false,
                no_padding: true,
                animation: "slide-left",
                animation_speed_in: 200,
                animation_speed_out: 200,
                transition_speed: 0,
                buttons: [
                    {
                        label: "Ok",
                        halign: "left"
                    }
                ]
            },
            load: function(options) {

                var default_settings = this.settings,
                    settings = $.extend({}, default_settings, options),
                    settings_override,
                    original_css;
                window.aui.utils.responsivise_settings(settings);

                if (settings.squeeze_content && $(settings.squeeze_elements).length) {
                    original_css = $(settings.squeeze_elements).attr("style");
                }

                settings_override = {
                    type: "panel",
                    box_height: "100%",
                    cover_background: false,
                    css_class: "aui-pane" + (settings.squeeze_content ? " aui-pane-squeeze-content " : " ") + (settings.css_class || ""),
                    close_button_class: settings.show_toggle_button ? "aui-pane-close-label" : undefined,
                    close_button_icon_class: settings.close_button_icon_class || (settings.show_toggle_button ? "fa fa-angle-right" : undefined),
                    close_button_icon_class_inactive: settings.close_button_icon_class_inactive || undefined,
//                    on_load: function() {
//                        if (window.aui.utils.is_function(settings.on_load)) {
//                            settings.on_load();
//                        }
//                    },
                    on_before_animate: function() {
                        $("body").addClass("aui-pane-active");
                    },
                    on_animate_in: function() {
                        var elements = $(settings.squeeze_elements),
                            existing_boxes = window.aui.overlay_box.boxes,
                            do_squeeze_elements = true;

                        for (var property in existing_boxes) {
                            if (existing_boxes.hasOwnProperty(property)) {
                                if (existing_boxes[property].id != settings.id && existing_boxes[property].squeeze_content && existing_boxes[property].state == "active" && parseInt(existing_boxes[property].box_width) > parseInt(settings.box_width)) {
                                    do_squeeze_elements = false;
                                    break;
                                }
                            }
                        }
                        if (settings.squeeze_content && elements.length && do_squeeze_elements) {
                            $(settings.squeeze_elements).css({
                                transition: "width "+(settings.animation_speed_in/1000)+"s ease",
                                width: "calc(100% - "+settings.box_width+")",
                            });

                            // unfortunately this hack is require to overcome a bug in Safari 11
                            $(settings.squeeze_elements).css({
                                display: 'inline-block'
                            });
                            window.setTimeout(function() {
                                $(settings.squeeze_elements).css('display', '');
                            }, 0);
                        }
                    },
                    on_before_close: function() {
                        var existing_boxes = window.aui.overlay_box.boxes,
                            not_active = true;
                        for (var property in existing_boxes) {
                            if (existing_boxes.hasOwnProperty(property)) {
                                if (existing_boxes[property].id != settings.id && existing_boxes[property].state == "active") {
                                    not_active = false;
                                    break;
                                }
                            }
                        }
                        if (not_active) {
                            $("body").removeClass("aui-pane-active");
                            $("body").removeClass("aui-pane-showing");
                        }


                        if (settings.squeeze_content && $(settings.squeeze_elements).length) {
                            var existing_boxes = window.aui.overlay_box.boxes,
                                do_squeeze_elements = true;
                            for (var property in existing_boxes) {
                                if (existing_boxes.hasOwnProperty(property)) {
                                    if (existing_boxes[property].id != settings.id && existing_boxes[property].squeeze_content && existing_boxes[property].state == "active") {
                                        do_squeeze_elements = false;
                                        break;
                                    }
                                }
                            }

                            if (do_squeeze_elements) {
                                $(settings.squeeze_elements).css({
                                    transition: "width "+(settings.animation_speed_out/1000)+"s ease",
                                    width: ""
                                });
                            }
    //                        setTimeout(function() {
    //                            $(settings.squeeze_elements).attr("style", original_css);
    //                        }, settings.animation_speed_out);
                        }

                        if (window.aui.utils.is_function(settings.on_before_close)) {
                            settings.on_before_close();
                        }
                    },
                    on_close: function() {
                        var existing_boxes = window.aui.overlay_box.boxes,
                            not_active = true;
                        for (var property in existing_boxes) {
                            if (existing_boxes.hasOwnProperty(property)) {
                                if (existing_boxes[property].id != settings.id && existing_boxes[property].state == "active") {
                                    not_active = false;
                                    break;
                                }
                            }
                        }
                        if (not_active) {
                            $("body").removeClass("aui-pane-active");
                            $("body").removeClass("aui-pane-showing");
                        }
                    }
                }

                return window.aui.overlay_box.load($.extend({}, settings, settings_override));
            },
            show: function(id) {
                var id = id || this.settings.id;
                window.aui.overlay_box.show(id);
                $("body").addClass("aui-pane-showing");
            },
            hide: function(id) {
                var id = id || this.settings.id;
                window.aui.overlay_box.hide(undefined, $("#"+id));
                $("body").removeClass("aui-pane-showing");
            },
            close: function(id) {
                var id = id || this.settings.id;
                window.aui.overlay_box.close(undefined, $("#"+id));
            },
            state: function(id) {
                var id = id || this.settings.id,
                    selector = id ? '#' + id : '.aui-pane:last',
                    settings = window.aui.overlay_box.get_settings(id);

                return settings.state;

            }

        }, // (/PANE)

        stickybox: {
            settings: {
                stick_to: "element",
                halign: "center",
                valign: "middle",
                auto_edge_dodge: true,
                element_halign: "center",
                element_valign: "top",
                position: "bottom",
                width: null,
                height: null,
                fixed: false,
                padding: false,
                z_index: null,
                show_arrow: true,
                toggle: true,
                custom_class: "",
                on_close: null,
                on_load: null,
                close_button: "#close-stickybox",
                show_close_button: false
                //constraint_element: window //aui.scroll_element
            },
            load: function(element, options) {

                /*
                 * Opens a box that sticks to the cursor or the element you specify.
                 *
                 * The box will close whenever a mousedown event occurs outside of the box.
                 *
                 * NOTE: Currently the box position will get messed up if the container element changes it's height.
                 *
                 * TODO: Make auto_edge_dodge work on browser resize.
                 *
                 * ARGUMENTS
                 * ---------
                 *
                 * Content: HTML content as a string.
                 *
                 * Options:
                 *
                 * stick_to: "element" or "cursor" - the box sticks to
                 * the middle of the element or to the cursor
                 *
                 * position: "top", "left", "right" or "bottom"
                 *
                 * halign: "left", "right" or "center". The horizontal
                 * alignment of the box relative to the cursor or the
                 * center of the element
                 *
                 * valign: "top" or "bottom". Vertical alignment of the box.
                 *
                 * element_halign: "left", "right" or "center". The horizontal
                 * position of the stickybox in relation to the element it sticks to.
                 *
                 * auto_edge_dodge: true or false. Make the stickybox change it's position
                 * if it goes out of view of the browser window.
                 *
                 * width: Width of the box (applied as inline style) as a string with unit (e.g "300px")
                 *
                 * height: Height of the box (applied as inline style) as a string with unit (e.g "300px")
                 *
                 * show_arrow: option to show or hide the arrow that points from stickybox to the element
                 *
                 * toggle: if true close stickybox when loading on the same element
                 *
                 * on_close: Callback function for when box closes
                 *
                 * on_load: Callback method for when box opens
                 *
                 * close_button: jQuery selector for a button to close the box.
                */

                if (!($(element).length > 0)) {
                    console.log("Error: stickyBox failed: Element doesn't exist");
                    return false;
                }

                // external dependencies
                var _public_settings = window.aui.stickybox.settings,
                    _is_function = window.aui.utils.is_function;


                var settings = $.extend({}, _public_settings, {id: $(".aui-stickybox").length + 1}, options),
                    element_offset = $(element).offset(),
                    scroll_offset = "",
                    panel_parent = $(element).closest(".aui-pane"),
                    overlay_box_parent = $(element).closest(".aui-overlay-box");

                // set container element depending on context
                if (!settings.container_element) {
                    if (settings.fixed) {
                        settings.container_element = "body";
                    //} else if (panel_parent.length) {
                    //    settings.container_element = panel_parent;
                    } else if (overlay_box_parent.length) {
                        settings.container_element = overlay_box_parent;
                        settings.sticky_scroll = true;
                    } else if ($("#aui-content").length) {
                        settings.container_element = "#aui-content";
                    } else {
                        settings.container_element = "body";
                        settings.sticky_scroll = true;
                    }
                }


                // convert number to pixels
                if (!isNaN(settings.width)) {
                    settings.width = settings.width + "px";
                }

                // push instance object
                this.instances.push({
                    id: settings.id,
                    settings: settings
                });

                //scroll_offset = $(settings.container_element).offset();
                scroll_offset = {
                    top: $(settings.container_element).offset().top - $(settings.container_element).scrollTop(),
                    left: $(settings.container_element).offset().left - $(settings.container_element).scrollLeft()
                }

                if(!$(element).attr("data-sticky-element")) {
                    var caller_width = $(element).outerWidth(),
                        caller_height = $(element).outerHeight();

                    /**
                     * don't allow multiple stickyboxes
                     * todo: is this necessary? kept but overridden for the gc-edit popup so the jcal popup works inside.
                     */
                //    if (!$(element).closest('#gc-edit').length && $("[data-sticky-element]").length) {
                //        window.aui.stickybox.close(settings.id);
                //        return false;
                //    }
                    
                //    if (!$(element).closest('#cdd-aml-edit').length && $("[data-sticky-element]").length) {
                //        window.aui.stickybox.close(settings.id);
                //        return false;
                //    }

                    var stickybox_obj = this.add_html_to_dom(settings.id);

                    $(element).attr("data-sticky-element", settings.id)

                    if (settings.sticky_scroll) {
                        $(element).attr("data-aui-sticky-anchor", settings.id);
                    }

                    //$(container_element).append("<div class='aui-stickybox' data-sticky-element='" + sticky_box_count + "' " + sticky_box_styles + ">" + (markup || content) + "</div>");
                    //var stickybox_obj = $(".aui-stickybox[data-sticky-element='" + sticky_box_count + "']");

                    var relative_halign = {
                        right: caller_width,
                        left: 0,
                        center: $(element).outerWidth() / 2
                    }
                    // this is for the vertical position of the box in relation to the element
                    var relative_valign = {
                        top: stickybox_obj.outerHeight() - caller_height / 2 - 15, // minus 20 to allow space for the arrow
                        middle: stickybox_obj.outerHeight() / 2 - caller_height / 2,
                        bottom: caller_height / 2 - 15 // minus 20 to allow space for the arrow
                    }

                    // calculate the different positions for stickybox and store them in an object

                    if (settings.stick_to === "cursor") {

                        var horizontal_offsets = {
                            right: window.aui.meta.cursorX - scroll_offset.left - stickybox_obj.width() + 14,
                            left: window.aui.meta.cursorX - scroll_offset.left - 14,
                            center: window.aui.meta.cursorX - scroll_offset.left - stickybox_obj.width() / 2
                        }
                        var vertical_offsets = {
                            top: window.aui.meta.cursorY - scroll_offset.top - stickybox_obj.height() - 10,
                            bottom: window.aui.meta.cursorY - scroll_offset.top + 10
                        }
                    } else {
        //                var horizontal_offsets = {
        //                    right: element_offset.left - scroll_offset.left - stickybox_obj.outerWidth() + relative_halign[settings.element_halign] + 14,
        //                    left: element_offset.left - scroll_offset.left + relative_halign[settings.element_halign] - 14,
        //                    center: element_offset.left - scroll_offset.left - stickybox_obj.outerWidth() / 2 + relative_halign[settings.element_halign]
        //                }
        //                var vertical_offsets = {
        //                    top: element_offset.top - scroll_offset.top - relative_valign[settings.element_valign],// - 10,
        //                    bottom: element_offset.top - scroll_offset.top + caller_height + 10
        //                }
                    }

                    var halign = {
                        left: 0 - 14,
                        center: 0 - stickybox_obj.outerWidth() / 2,
                        right: 14 - stickybox_obj.outerWidth()
                    }

                    // TODO: check if it might help to use the aui.element_position method
                    var positions = {
                        top: {
                            valign: {
                                top: element_offset.top - scroll_offset.top - stickybox_obj.outerHeight() - 10, //relative_valign.top,
                                middle: element_offset.top - scroll_offset.top - stickybox_obj.outerHeight() - 10, //relative_valign.top,
                                bottom: element_offset.top - scroll_offset.top - stickybox_obj.outerHeight() - 10 //relative_valign.top
                            },
                            halign: {
                                left: element_offset.left - scroll_offset.left + halign.left + relative_halign.left,
                                center: element_offset.left - scroll_offset.left + halign.center + relative_halign.center,
                                right: element_offset.left - scroll_offset.left + halign.right + relative_halign.right
                            }
                        },
                        left: {
                            halign: {
                                left: element_offset.left - scroll_offset.left - stickybox_obj.outerWidth() - 14,
                                center: element_offset.left - scroll_offset.left - stickybox_obj.outerWidth() - 14,
                                right: element_offset.left - scroll_offset.left - stickybox_obj.outerWidth() - 14
                            },
                            valign: {
                                top: element_offset.top - scroll_offset.top - relative_valign.top,
                                middle: element_offset.top - scroll_offset.top - relative_valign.middle,
                                bottom: element_offset.top - scroll_offset.top + relative_valign.bottom
                            }
                        },
                        right: {
                            halign: {
                                left: element_offset.left - scroll_offset.left + caller_width + 14,
                                center: element_offset.left - scroll_offset.left + caller_width + 14,
                                right: element_offset.left - scroll_offset.left + caller_width + 14
                            },
                            valign: {
                                top: element_offset.top - scroll_offset.top - relative_valign.top,
                                middle: element_offset.top - scroll_offset.top - relative_valign.middle,
                                bottom: element_offset.top - scroll_offset.top - relative_valign.bottom
                            }
                        },
                        bottom: {
                            valign: {
                                top: element_offset.top - scroll_offset.top + caller_height + 10, //relative_valign.bottom,
                                middle: element_offset.top - scroll_offset.top + caller_height + 10, //relative_valign.bottom,
                                bottom: element_offset.top - scroll_offset.top + caller_height + 10 //relative_valign.bottom
                            },
                            halign: {
                                left: element_offset.left - scroll_offset.left + halign.left + relative_halign.left,
                                center: element_offset.left - scroll_offset.left + halign.center + relative_halign.center,
                                right: element_offset.left - scroll_offset.left + halign.right + relative_halign.right
                            }
                        }
                    }

                    // if the stickybox is below the element, the arrow should be at the top, etc.

                    var opposite = {
                        top: "bottom",
                        left: "right",
                        right: "left",
                        bottom: "top",
                        center: "center",
                        middle: "middle"
                    }

                    var arrow_position = opposite[settings.position],
                        arrow_h = settings.halign,
                        arrow_v = opposite[settings.valign];

                    var auto_position = settings.position;
                    var auto_valign = settings.valign;
                    var auto_halign = settings.halign;

                    // detect if there's no room for stickybox and change the alignment accordingly

                    var wrapper_width = $(settings.container_element).width();
                    var stickybox_width = stickybox_obj.outerWidth();



                    var too_far_right = positions[settings.position].halign[settings.halign] + stickybox_width > wrapper_width;
                    var too_far_left = scroll_offset.left + positions[settings.position].halign[settings.halign] < 0;

                    // debug
                    if (window.aui.debug) {
                        console.log(settings);
                        console.log("wrapper_width: " + wrapper_width);
                        console.log("stickybox_width: " + stickybox_width);
                        console.log("scroll_offset.left: " + scroll_offset.left);
                        console.log("position left: " + positions[settings.position].halign[settings.halign]);
                        console.log("position right: " + positions[settings.position].halign[settings.halign] + stickybox_width);
                    }

                    if (too_far_right) {
                        if (settings.position === "top" || settings.position === "bottom") {
                            auto_halign = "right";
                            arrow_h = "right";
                        } else {
                            auto_position = "left";
                            arrow_position = "right";
                        }

                    } else if (too_far_left) {
                        if (settings.position === "top" || settings.position === "bottom") {
                            auto_halign = "left";
                            arrow_h = "left";
                        } else {
                            auto_position = "right";
                            arrow_position = "left";
                        }
                    }

                    var too_far_up = scroll_offset.top + element_offset.top - (stickybox_obj.height() + 10) < scroll_offset.top;
                    var too_far_down = scroll_offset.top + positions[settings.position].valign[settings.valign] + stickybox_obj.height() + 10 > window.aui.meta.window_height;

                    if (too_far_up) {
                        if (settings.position === "left" || settings.position === "right") {
                            auto_valign = "bottom";
                            arrow_v = "top";
                        } else {
                            auto_position = "bottom";
                            arrow_position = "top";
                        }

                    } else if (too_far_down) {
                        if (settings.position === "left" || settings.position === "right") {
                            auto_valign = "top";
                            arrow_v = "bottom";
                        } else {
                            auto_position = "top";
                            arrow_position = "bottom";
                        }
                    }

                    var stickybox_classes = "";

                    // add arrow class for css arrow

                    if (settings.show_arrow) {
                        if (auto_position === "top" || auto_position === "bottom") {
                            stickybox_classes += "aui-arrow-" + arrow_position + "-" + arrow_h;
                        } else {
                            stickybox_classes += "aui-arrow-" + arrow_position + "-" + arrow_v;
                        }

                    }

                    // add custom class to stickybox

                    if (settings.custom_class) {
                        stickybox_classes += " " + settings.custom_class;
                    }

                    if (stickybox_classes) {
                        $(stickybox_obj).addClass(stickybox_classes);
                    }

                    // now position the stickybox
                    if (settings.stick_to === "element") {
                        if (settings.auto_edge_dodge) {
                            stickybox_obj.css({
                                top: positions[auto_position].valign[auto_valign],
                                left: positions[auto_position].halign[auto_halign]
                            });
                        } else {
                            stickybox_obj.css({
                                top: positions[settings.position].valign[settings.valign],
                                left: positions[settings.position].halign[settings.halign]
                            });
                        }
                    } else {
                        stickybox_obj.css({
                            top: auto_position == 'top' ? vertical_offsets['top'] : vertical_offsets[settings.valign],
                            left: horizontal_offsets[settings.halign]
                        });
                    }

                    this.on_load(settings.id);


                } else {
                    // element already has an active stickybox
                    if (settings.toggle) {
                        // this enables a 'toggle' type functionality
                        window.aui.stickybox.close(settings.id);
                    }
                }

                this.events.add_listeners(settings.id);

                return element;
            },
            get_html: function(id) {

                var settings = this.get_settings(id),
                    close_button = "",
                    sticky_box_styles = "",
                    html = "";

                if (settings.width) {
                    var sticky_box_width = "width: " + settings.width + ";";
                    var sticky_box_height = "height: " + settings.height + ";";
                }

                if (settings.z_index) {
                    var z_index = "z-index: " + settings.z_index + ";";
                }

                if (settings.padding) {
                    var padding = "padding: " + settings.padding + ";";
                }

                if (settings.show_close_button) {
                    close_button = '<button class="aui-stickybox-close"><i class="aui-icon-cross"></i></button>'
                }

                sticky_box_styles = "style='" + (sticky_box_width || "") + (sticky_box_height || "") + (z_index || "") + (padding || "") + "'";

                if ($.isArray(settings.content)) {

                    // if the content variable is an array,
                    // create a list where each value of the array is a
                    // separate list item

                    var markup = "<ul class='aui-grid aui-columns-1'>";

                    $.each(settings.content, function(index, value) {
                        markup += "<li class='aui-item'>" + value + "</li>";
                    });

                    markup += "</ul>";
                }

                html = "<div class='aui-stickybox' data-aui-sticky='" + settings.id + "' data-sticky-element='" + settings.id + "' " + sticky_box_styles + ">" + (markup || settings.content) + close_button + "</div>";

                return html;

            },
            add_html_to_dom: function(id) {
                var settings = this.get_settings(id),
                    html = $(this.get_html(id));

                $(settings.container_element).append(html);

                return html;
            },
            on_load: function(id) {
                var settings = this.get_settings(id),
                    stickybox_element = this.get_box_element(id);

                if (settings.on_load) {
                    /* we pass to on_load() the clicked obj (the object that the stickybox
                     * sticks to) and the stickybox obj that was created and now
                     * contains the html...
                     */
                    var stickybox_clicked_obj = this.get_stick_element(id);
                    var close = function() {window.aui.stickybox.close(id)};
                    settings.on_load(stickybox_clicked_obj, stickybox_element, close);
                }

                $(stickybox_element).trigger("open");
            },
            events: {
                add_listeners: function(id) {

                    var settings = window.aui.stickybox.get_settings(id),
                        close = window.aui.stickybox.close;

                    // event handler for stickybox close button
                    $("body")
                        .off("click.sb_close_btn_" + id)
                        .on("click.sb_close_btn_" + id, settings.close_button, function() {
                            close(id);
                        });

                    // clicking/dragging anywhere on the body closes stickybox, unless you click on stickybox itself
                    $("body")
                        .off("mousedown.sb_close_click_" + id + " touchstart.sb_close_click_" + id)
                        .on("mousedown.sb_close_click_" + id + " touchstart.sb_close_click_" + id, function(event) {
                            var target = event.target || event.srcElement;
                            if(!$(target).parents().hasClass("aui-stickybox") && !$(target).hasClass("aui-stickybox") && !$(target).attr("data-sticky-element") && !$(target).parents().attr("data-sticky-element")) {
                                close(id);
                            }
                        });

                    // standard class for buttons to close sb
                    $(".aui-stickybox-close")
                        .off("click.close_stickybox")
                        .on("click.close_stickybox", function() {
                            close(id);
                        });

                    $(".aui-overlay-box-content-wrapper")
                        .off("scroll.sb")
                        .on("scroll.sb", function(event) {
                            close(id);
                        });

                },
                remove_listeners: function() {}
            },
            state: function(id) {
                var stickybox = this.get_box_element(id);

                if (stickybox.length) {
                    return true;
                } else {
                    return false;
                }
            },
            close: function(id) {

                // external dependencies
                var _is_function = window.aui.utils.is_function;

                var stickybox_element = window.aui.stickybox.get_box_element(id),
                    position_element, // this is the element the box sticks to
                    settings = window.aui.stickybox.get_settings(id) || {};

                if (stickybox_element && stickybox_element.length) {
                    if ($("[data-sticky-element='" + id + "']").length) {
                        position_element = $("[data-sticky-element='" + id + "']:not(.aui-stickybox)");
                    } else {
                        position_element = $("[data-sticky-element]:not(.aui-stickybox)");
                    }

                    stickybox_element.remove();
                    position_element.removeAttr("data-sticky-element");
                    position_element.removeAttr("data-previous-position").removeAttr("data-aui-sticky-anchor");

                    window.aui.stickybox.get_instance(id).remove();

                    if(_is_function(settings.on_close)) {
                        /* we pass to on_close() the button target obj (the thing that was clicked)...
                         */
                        settings.on_close(position_element);
                    }
                    stickybox_element.trigger("close.stickybox");
                }
            },
            instances: [],
            get_instance: function(id) {
                var instance = {
                        remove: function() {}
                    },
                    instances = this.instances,
                    i = instances.length;

                if (id && i) {
                    while (i--) {
                        if (instances[i].id === id) {
                            instance = instances[i];
                            instance.remove = function() {
                                instances.splice(i, 1);
                            }
                            break;
                        }
                    }
                }

                return instance;
            },
            get_settings: function(id) {

                var settings = this.settings,
                    instances = this.instances;

                if (id && instances.length) {
                    settings = this.get_instance(id).settings;
                }

                return settings;

            },
            get_box_element: function(id) {
                var element;
                if (id && $("[data-sticky-element='" + id + "']").length) {
                    element = $(".aui-stickybox[data-sticky-element='" + id + "']");
                } else if (!id) {
                    element = $(".aui-stickybox");
                }
                return element;
            },
            get_stick_element: function(id) {
                var element;
                if (id && $("[data-sticky-element='" + id + "']").length) {
                    element = $("[data-sticky-element='" + id + "']:not(.aui-stickybox)");
                } else {
                    element = $("[data-sticky-element]:not(.aui-stickybox)");
                }
                return element;
            },
            resize: function() {
                if (this.state()) {
                    // TODO: REPOSITION STICKYBOX (FOR NOW JUST CLOSE STICKYBOX)
                    window.aui.close_stickybox();
                }
            }
        }, // (/STICKYBOX)

        /*
            aui.stickybox_menu.

            Create a menu in a stickybox. This works the exact same as the
            stickybox above, but you can feed in some menu items of the form.

            [
                {
                    label: 'Menu item 1',
                    callback: function () {
                        window.h.alert('clicked menu item 1');
                    }
                },
                {
                    label: 'Menu item 2',
                    callback: function () {
                        window.h.alert('clicked menu item 2');
                    },
                    separator: true
                }
            ]

        */
        stickybox_menu: {
            load: function ($elem, options) {
                this.$elem = $elem;
                options.menu_items = this.add_item_ids(options.menu_items);
                options.content = this.get_menu_html(options.menu_items);
                window.aui.stickybox.load($elem, options);
                this.add_button_events(options.menu_items);
            },

            add_item_ids: function (items) {
                for (var i in items) {
                    items[i].id = window.aui.utils.get_uid();
                }
                return items;
            },

            get_menu_html: function (items) {
                var content = '';
                items.forEach(function(item) {
                    if ('condition' in item && !item.condition) {
                        return;
                    }
                    let css_class = item.separator ? 'menu-separator' : '';
                    content += '<li class="' + css_class + '"><button id="stickybox-button-' + item.id + '">' + item.label + '</button></li>';
                })
                return '<ul class="stickybox-menu">' + content + '</ul>';
            },

            add_button_events: function (items) {
                $.each(items, function (index, item) {
                    var element = $('#stickybox-button-' + item.id);
                    element.off('click.sbm_button_click').on('click.sbm_button_click', function (event) {
                        if (item.callback) {
                            item.callback(element, event);
                        }
                    });
                });
            }
        },

        accordion: {
            data: {},
            add: function(accordion_name) {
                if (accordion_name) {
                    $("[data-accordion='" + accordion_name + "']").each(function(index, elem) {
                        var elem = $(elem);
                        // this is a fix re: sales pipeline - we have other dynamic text in the accordion label (total works offered) - this offers a simple fallback in that case of a static defined data accordion title
                        // on the data accordion button - this can be used wherever there is an accordion should you need to add any dynamic content in thew accordion label
                        var button = elem.find('button[data-accordion-toggle]');
                        var title = button.attr('data-accordion-title') ? button.attr('data-accordion-title') : h.encode_html(button.text()).replace(/ /g, '_');
                        elem.attr("data-accordion-id", title);
                    });
                } else {
                    $("[data-accordion]").each(function() {
                        if (!$(this).attr("data-accordion-id")) {
                            $("[data-accordion='" + $(this).data("accordion") + "']").each(function(index, elem) {
                                var elem = $(elem);
                                elem.attr("data-accordion-id", h.encode_html(elem.find('button[data-accordion-toggle]').text()).replace(/ /g, '_'));
                            });
                        }
                    });
                }

            },
            open: function(accordion, id, options) {
                var element;
                var settings = $.extend({
                    slide_speed: 0
                }, options);

                /** refactored to change from numeric index to id. some scripts pass in 0 */
                if (!id) {
                    //element = $("[data-accordion='" + accordion + "'][data-accordion-index='" + id + "']");
                    element = $("[data-accordion='" + accordion + "']").filter(":first");
                    id = element.attr('data-accordion-id');
                } else {
                    element = $("[data-accordion='" + accordion + "'][data-accordion-id='" + id + "']");
                }

                if (!element.hasClass("aui-active")) {

                    var content_element = $("[data-accordion='" + accordion + "'] [data-accordion-content]");
                    $("[data-accordion='" + accordion + "']").removeClass("aui-active");

                    if (settings.slide_speed) {
                        content_element.slideUp(settings.slide_speed);
                        element.addClass("aui-active");
                        element.children("[data-accordion-content]").slideDown(settings.slide_speed);
                    } else {
                        content_element.css("display", "none");
                        element.addClass("aui-active");
                        element.children("[data-accordion-content]").css("display", "block");
                    }

                } else {
                    if (settings.slide_speed) {
                        element.removeClass("aui-active");
                        element.children("[data-accordion-content]").slideUp(settings.slide_speed);
                    } else {
                        element.removeClass("aui-active");
                        element.children("[data-accordion-content]").css("display", "none");
                    }

                }

                if (!this.data[accordion]) {
                    this.data[accordion] = {
                        active: id
                    }
                } else {
                    this.data[accordion].active = id;
                }

                // Duncan: was interfering with list state saving
                // window.app.local_storage.set_item("active_accordion", {accordion: accordion, id: id});
            }
        }, // (/ACCORDION)


        // RATING
        // _______________________________________________________

        rating: function (options) {
            var settings = $.extend({
                    id: window.aui.utils.get_uid(),
                    max_rating: 5,
                    button_class: '',
                    container_class: '',
                    container_element: [],
                    container_element_selector: '',
                    read_only: false,
                    on_change: function (new_rating, old_rating) {}
                }, options),
                container_element = settings.container_element.length ? settings.container_element : $(settings.container_element_selector);

            // get html
            var html = '<div data-id="'+settings.id+'" class="aui-rating-btns aui-text-align-center '+settings.container_class+'" '+(settings.value ? 'data-value="'+settings.value+'" data-rating="'+settings.value+'"' : '')+'>';
            for (var i=0; i < settings.max_rating; i++) {
                html += '<button type="button" class="aui-rating-btn '+settings.button_class+(settings.read_only ? ' readonly ' : '')+'" data-index="'+(i+1)+'"></button>';
            }
            html += '</div>';

            // add html to dom
            if (container_element.length) {
                container_element.append(html);
            }

            // event listeners
            if (!settings.read_only) {
                container_element
                    .off('click.aui.rating.btn')
                    .on('click.aui.rating.btn', '.aui-rating-btn', function(event) {
                        var old_rating = container_element.find('.aui-rating-btns').attr('data-value'),
                            new_rating = $(this).attr('data-index'),
                            // if the same rating is clicked twice, reset to zero
                            rating_to_use = new_rating == old_rating ? 0 : new_rating;

                        // apply new rating
                        container_element.find('.aui-rating-btns').attr('data-rating', rating_to_use).attr('data-value', rating_to_use);

                        // trigger callback
                        settings.on_change(rating_to_use, old_rating);
                    });

                container_element
                    .off('mouseover.aui.rating.btn')
                    .on('mouseover.aui.rating.btn', '.aui-rating-btn', function() {
                        var rating = $(this).attr('data-index');
                        container_element.find('.aui-rating-btns').attr('data-rating', rating);
                    });

                container_element
                    .off('mouseleave.aui.rating.btn')
                    .on('mouseleave.aui.rating.btn', '.aui-rating-btn', function() {
                        var current_importance = container_element.find('.aui-rating-btns').attr('data-value');

                        if (current_importance) {
                            container_element.find('.aui-rating-btns').attr('data-rating', current_importance);
                        } else {
                            container_element.find('.aui-rating-btns').removeAttr('data-rating');
                        }
                    });

            }

        }, // (/RATING)

        menu: {

            //Menu dropdown
            // TODO: Refactor

            /*
             * This is the main nav dropdown menu. Although this works just with CSS
             * for the most part, we use javascript to make the stuff work that css can't.
             *
             *
             *
             *
             *
             *
             *
             *
             *
             *
          **/

            init: function() {

                this.event_handlers();

                $("#aui-head > div").css("max-height", window.aui.meta.window_height);

            },
            
            /* If a menu element goes off screen, apply the correct class so
            that it moves over to the other side. */
            reposition_menu_element: function ($element) {
                if (!$element.length) {
                    return;
                }
                var element_is_offscreen = window.aui.element_is_offscreen($element);
                if (!element_is_offscreen) {
                    return;
                }
                if (element_is_offscreen.right) {
                    $element.closest(".aui-dropdown-menu-item").addClass("aui-menu-left");
                } else if (element_is_offscreen.left) {
                    $element.closest(".aui-dropdown-menu-item").addClass("aui-menu-right");
                }
            },

            event_handlers: function() {
                var that = this;

                var touchStart = window.navigator.pointerEnabled ? "pointerdown" : window.navigator.msPointerEnabled ? "MSPointerDown" : "touchstart",
                    touchMove = window.navigator.pointerEnabled ? "pointermove" : window.navigator.msPointerEnabled ? "MSPointerMove" : "touchmove",
                    touchEnd = window.navigator.pointerEnabled ? "pointerup" : window.navigator.msPointerEnabled ?  "MSPointerUp" : "touchend",
                    pointer_event = false;

                // what's this doing?
                $(".aui-event-dropdown").on("pointerdown", function(event) {
                    if(event.originalEvent.pointerType == "touch") {
                        event.preventDefault();
                        pointer_event = true;
                    }
                });

                // what's this doing?
                $(".aui-event-dropdown").on("click", function(event) {
                    if(pointer_event && window.aui.meta.window_width >= window.aui.settings.menu_breakpoint) {
                        event.preventDefault();
                    }
                });

                // check if dropdown menu would be offscreen - if so reposition it
                $("nav").find("li").on('mouseover touchstart', function(event) {
                    event.stopImmediatePropagation();
                    var $element = $(this).children("div").children("ul");
                    that.reposition_menu_element($element);     
                });

                // Close dropdown menu when screen is tapped elsewhere
                $("body").on(touchStart, function(event) {
                    var target = event.target || event.srcElement;
                    if(!$(target).parents().hasClass("aui-nav")) {
                        $(".menu-open").removeClass("menu-open");
                    }
                });

                // Dropdown menu system for small screens/touch screens
                $("#aui-head, #aui-footer").on("click", ".aui-event-menu, .aui-event-dropdown", function(event) {
                    event.stopImmediatePropagation();
                    if ($(this).hasClass("aui-event-dropdown") && window.aui.meta.window_width < window.aui.settings.menu_breakpoint && (!window.aui.settings.disable_mobile_dropdown || $(this).hasClass("aui-event-menu"))) {
                        event.preventDefault();
                    }
                    if (!window.aui.settings.disable_mobile_dropdown || $(this).hasClass("aui-event-menu")) {
                        //window.aui.menu.mobileDropdown(this);
                    }

                });

                $("a.aui-nav-item").click(function(event) {
                    if (!$(this).hasClass("aui-event-dropdown")) {
                        //$(".aui-event-menu").trigger("click");
                    }
                });

                $(".aui-event-dropdown").on(touchStart, function(event) {  
                    if (window.aui.meta.window_width < window.aui.settings.menu_breakpoint) {
                        return;
                    }
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    var $element = $(this).parent().children("div").children("ul");
                    that.reposition_menu_element($element);   
                });

                // Dropdown menu system for touch screens (size medium to large)
                $("#aui-head").find("button.aui-event-dropdown, a.aui-event-dropdown").on(touchStart, function(event) {
                    if(window.aui.meta.window_width >= window.aui.settings.menu_breakpoint && !$("body").hasClass("aui-header-position-left") && $(this).hasClass("aui-event-dropdown")) {

                        event.preventDefault();
                        event.stopImmediatePropagation();

                        var open_parents = $(this).parents(".menu-open");

                        $(".menu-open").removeClass("menu-open");
                        $(open_parents).addClass("menu-open");
                        $(this).siblings("div").addClass("menu-open");

                        checkElementOffScreen($(this).siblings("div").children("ul"));
                    } else {
                        // edited out to fix problem on tablets - will this cause unknown issues?
                        // $(".menu-open").removeClass("menu-open");
                    }

                });

            },

        },

        animate_header: {

            // TODO: This is a mighty big function for such a small feature. Refactor!

            init: function(options) {

                this.settings = $.extend({
                    element: "#aui-head"
                }, options);

                // fixme
                window.aui.animate_header.elementPadding = $("#aui-head").find("> div").css("padding-top");
                window.aui.animate_header.current_scroll_position = window.aui.meta.scroll_position;

                var that = this,
                    touch = true,
                    touch_starter,
                    touch_event_start = {},
                    touch_event_move = {},
                    custom_header_active = (window.aui.header && window.aui.header.display_custom_header);

                if (!$("body").hasClass("aui-animate-header-true")) {
                    $("body").addClass("aui-animate-header-true");
                }

                if (window.aui.settings.animate_header) {
                    if(!(window.aui.header && window.aui.header.header_animation === "scrollover") && window.aui.animate_header.current_scroll_position > 0) {
                        $("#aui-head").addClass("page-scroll");
                        window.aui.animate_header.effects[window.aui.animate_header.settings.effect](false, "down");
                    } else if((window.aui.header && window.aui.header.header_animation === "scrollover") && $("#aui-content").offset().top < 70) {
                        $("#aui-head").addClass("page-scroll");
                        window.aui.animate_header.effects[window.aui.animate_header.settings.effect](false, "down");
                    }
                }

                $("body").on("touchstart", function(event){
                    touch_event_start = event.originalEvent.touches[0];
                    touch_starter = touch_event_start.pageY;
                    touch = true;
                    window.aui.animate_header.has_touch_screen = true;
                });

                // custom code for iOS 5
                if(!(navigator.userAgent.match(/OS 5(_\d)+ like Mac OS X/i))) {
                    $("body").on("touchmove", function(event) {

                        touch_event_move = event.originalEvent.touches[0];

                        if(touch) {

                            if(touch_starter !== touch_event_move.pageY) {

                                if(!$("#aui-head, #aui-custom-header-container").hasClass("page-scroll") && touch_starter > touch_event_move.pageY) {

                                    if($("#aui-custom-header").length > 0 ) {
                                        $(aui.scroll_element).removeClass("aui-remove-scroll");
                                        if(window.aui.header && window.aui.header.header_animation === "shrink") {
                                            event.preventDefault();
                                            event.stopImmediatePropagation();
                                        }
                                    }

                                    touch = false;

                                } else if(window.aui.meta.scroll_position === 0  && touch_starter < touch_event_move.pageY) {

                                    if($("#aui-custom-header").length > 0) {
                                        // fix for juddering caused by elastic bounce effect
                                        $(aui.scroll_element).addClass("aui-remove-scroll");
                                        if(window.aui.header && window.aui.header.header_animation === "shrink") {
                                            event.preventDefault();
                                            event.stopImmediatePropagation();
                                        }
                                        $(aui.scroll_element).scrollTop(0);
                                    }

                                    window.aui.animate_header.header_open();

                                    touch = false;

                                }
                            }
                        }

                    });

                }


                $(aui.scroll_element).scroll(function() {
                    if (window.aui.settings.animate_header) {
                        window.aui.animate_header.scroll();
                    }
                });

                $(window).resize(function() {
                    get_element_padding();
                });

                var get_element_padding = window.aui.utils.debounce(function() {
                    var current_padding;
                    if ($("#aui-head").hasClass("page-scroll")) {
                        current_padding = parseInt($("#aui-head").find("> div").css("padding-top")) * 2 + "px";
                    } else {
                        current_padding = $("#aui-head").find("> div").css("padding-top");
                    }
                    window.aui.animate_header.elementPadding = current_padding;
                }, 500);

            },

            transition_ended: false,

            header_close: function(custom_header_active) {
                $("#aui-head").addClass('page-scroll');

                // the custom_header stuff should be moved to a callback somewhere in the custom_header code
                if (custom_header_active) {
                    $("#aui-custom-header-container, #aui-content").addClass('page-scroll');

                    $("#aui-custom-header-container").on("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function(event) {

                        if($("#aui-head").hasClass("page-scroll")) {
                            $("#aui-custom-header").addClass("aui-transition-end");
                            window.aui.animate_header.transition_ended = true;
                        } else {
                            window.aui.animate_header.transition_ended = false;
                        }
                    });

                    $("#aui-head nav > ul ul a, #aui-head nav > ul ul button").css("color", "");
                }

                window.aui.animate_header.scroll_state = "down";

                if(window.aui.animate_header.settings.effect) {
                    window.aui.animate_header.effects[window.aui.animate_header.settings.effect]($("#aui-head"));
                }

                if (custom_header_active) {
                    window.aui.custom_header.set_navigation_colours(0, true);
                    window.aui.custom_header.set_text_colour(false, true);
                }
            },

            header_open: function(custom_header_active) {
                $("#aui-head").removeClass("page-scroll");

                window.aui.animate_header.scroll_state = "up";

                // the custom_header stuff should be moved to a callback somewhere in the custom_header code
                if (custom_header_active) {
                    $("#aui-custom-header").removeClass("aui-transition-end");
                    $("#aui-custom-header-container, #aui-content").removeClass("page-scroll");

                    window.aui.custom_header.set_navigation_colours();
                    window.aui.custom_header.set_text_colour($(".aui-page_title, .aui-page_subtitle, nav > ul > li > a, #aui-organisation, #aui-organisation a, nav > ul > li > button, .aui-event-menu"));
                }

                if(window.aui.animate_header.settings.effect) {
                    window.aui.animate_header.effects[window.aui.animate_header.settings.effect]($("#aui-head"));
                }
            },

            effects: {
                resize: function(element) {
                    if(window.aui.animate_header.scroll_state == "down") {
                        $("#aui-head").find("> div").stop().css({
                            "paddingTop": parseInt(window.aui.animate_header.elementPadding) / 2,
                            "paddingBottom": parseInt(window.aui.animate_header.elementPadding) / 2
                        });
                    } else if(window.aui.animate_header.scroll_state == "up") {
                        $("#aui-head").find("> div").stop().css({
                            "paddingTop": window.aui.animate_header.elementPadding,
                            "paddingBottom": window.aui.animate_header.elementPadding
                        }, 500, function() {
                            $("#aui-head").find("> div").css({
                                "paddingTop": "",
                                "paddingBottom": ""
                            });
                        });
                    }
                }
            },

            scroll: function() {
                var scroll_position = window.aui.meta.scroll_position;
                var content_offset_top = $("#aui-content").offset().top;
                var is_active = $("#aui-head, #aui-custom-header-container").hasClass('page-scroll');

                if (scroll_position < 0) {
                    setTimeout(function() {
                        window.aui.animate_header.header_open();
                    }, 200);
                } else {
                    is_active = $("#aui-head, #aui-custom-header-container").hasClass("page-scroll");

                    if(window.aui.header && window.aui.header.header_animation === "scrollover") {
                        if(!is_active && content_offset_top < 70 && !window.aui.animate_header.has_touch_screen) {
                            window.aui.animate_header.header_close();
                        } else if(is_active && window.aui.animate_header.current_scroll_position > scroll_position && content_offset_top > 70) {
                            if(window.aui.animate_header.has_touch_screen) {
                                if(scroll_position === 0 && !(window.navigator.userAgent.match(/OS 5(_\d)+ like Mac OS X/i))) {
                                    window.aui.animate_header.header_open();
                                }
                            } else {
                                window.aui.animate_header.header_open();
                            }

                        }
                    } else {
                        if(!is_active && window.aui.animate_header.current_scroll_position < scroll_position) {
                            window.aui.animate_header.header_close();
                        } else if(is_active && window.aui.animate_header.current_scroll_position > scroll_position && scroll_position <= window.aui.animate_header.settings.scrollPosition) {
                            window.aui.animate_header.header_open();
                        }
                    }

                    window.aui.animate_header.current_scroll_position = scroll_position;
                }
            }
        },

        dom_filter: {
            init: function(elem) {
                elem = elem || $('.aui-dom-filter');
                var placeholder = elem.data('action') === 'scroll' ? 'Search...' : 'Filter...';
                elem.addClass('hide-on-smartphone').html(
                    '<input type="text" class="aui-dom-filter-input" placeholder="' + placeholder + '"> <span class="aui-dom-filter-clear">&nbsp;&nbsp;&nbsp;</span>'
                     + (elem.data('show_findall') ? '<br><button type="button" class="aui-dom-filter-findall">Find all</button>': '')
                );
                window.aui.dom_filter.event_handlers();
            },

            event_handlers: function() {
                $('.aui-dom-filter-input').off('keyup').on('keyup', function() {
                    var elem = $(this);
                    var action = elem.parent().data('action');
                    var val = $.trim(elem.val()).replace(/ +/g, ' ').toLowerCase();

                    if (action === 'scroll' && val) {
                        var found = $(elem.parent().data('for') || '.aui-filtered-item').filter(function() {
                            var text = (($(this).data('filter_string') || '') + '') || $(this).text();
                            text = text.replace(/\s+/g, ' ').toLowerCase();
                            return text.indexOf(val) > -1;
                        }).get(0);
                        if (found) {
                            found.scrollIntoView();
                        }

                    } else {
                        $(elem.parent().data('for') || '.aui-filtered-item').show().filter(function() {
                            var text = (($(this).data('filter_string') || '') + '') || $(this).text();
                            text = text.replace(/\s+/g, ' ').toLowerCase();
                            return text.indexOf(val) === -1;
                        }).hide();
                    }
                });

                $('.aui-dom-filter-clear, .aui-dom-filter-findall').off('click').on('click', function() {
                    $('.aui-dom-filter-input').val('').trigger('keyup');
                });
            }
        },

        return_grid: function(array) {

            var html = "";

            if($.isArray(array[0])) {
                html = '<ul class="aui-grid aui-columns-' + array[0].length + '">';

                for(var i = 0; i < array.length; i++) {
                    for(var x = 0; x < array[i].length; x++) {
                        html += '<li class="aui-item">' + array[i][x] + '</li>';
                    }
                }
            } else {
                html = '<ul class="aui-grid aui-columns-' + array.length + '">';

                for(var i = 0; i < array.length; i++) {
                    html += '<li class="aui-item">' + array[i] + '</li>';
                }
            }

            html += '</ul>';

            return html;
        },

        grid_template: function(data, element, columns, column_spacing, image_alignment, image_proportion) {

            var settings = ['columns', 'column_spacing', 'image_alignment', 'image_proportion'];
            var i = 0;
            var counter = settings.length;
            while(counter--) {
                if(eval(settings[i])) {
                    data[settings[i]] = "aui-" + settings[i].replace("_", "-") + "-" + eval(settings[i]);
                } else if(data.window.aui.templates.grid.appearance[settings[i].replace("_", "-")]) {
                    data[settings[i]] = "aui-" + settings[i].replace("_", "-") + "-" + data.window.aui.templates.grid.appearance[settings[i].replace("_", "-")];
                } else if(data.window.aui.global.appearance[settings[i].replace("_", "-")]) {
                    data[settings[i]] = "aui-" + settings[i].replace("_", "-") + "-" + data.window.aui.global.appearance[settings[i].replace("_", "-")];
                }
                i++;
            }

            var source = $("#grid-template").html();
            var template = Handlebars.compile(source);
            var context = data;
            var html = template(context);
            $(element).html(html);
        },

        set_header: function(content, slide_speed) {
            if($("#aui-header-content-box").html() != window.aui.utils.html_encode(content)) {
                window.aui.header_content.load(content, slide_speed);
            }
        },

        hide_header: function(slide_speed) {
            window.aui.header_content.close(slide_speed);
        },

        header_content: {

            load: function(html, slide_speed) {

                /*
                 * Insert content (html) into the header, below the nav.
                 *
                 * ARGUMENTS
                 * ---------
                 *
                 * html: Content to be inserted
                */

                var insert_value = "",
                    the_height = 0;

                if($.isArray(html)) {

                    insert_value = window.aui.return_grid(html);

                } else if(html) {
                    insert_value = html;
                } else {

//                    this.close(slide_speed);
//
//                    return false;
                }


                if($("#aui-header-content-box").html() != window.aui.utils.html_encode(insert_value)) {
                    $("#aui-header-content-box").html(insert_value);
                    if($("#aui-header-content-box").not(":visible")) {
                        $("#aui-header-content-box").addClass("aui-active");
                        //$("#aui-header-content-box").slideDown(slide_speed || 500);
                    }
                    $("body").addClass("aui-header-content-visible");
                } else {
                    if($("#aui-header-content-box").is(":visible")) {
//                        this.close(slide_speed);
                    } else {
                        //$("#aui-header-content-box").slideDown(slide_speed || 500);
                        $("#aui-header-content-box").addClass("aui-active");
                    }
                }

                $('body').trigger('header_content_change');
            },

            close: function(slide_speed) {

                $("#aui-header-content-box").addClass("aui-header-content-closing");
                $("#aui-header-content-box").html("");
                $("#aui-header-content-box").removeClass("aui-active");
                $("#aui-header-content-box").removeClass("aui-header-content-closing");
                $("body").removeClass("aui-header-content-visible");

                if (window.aui.meta.scroll_position === 0) {
                    $("#aui-header-content-box").removeClass("page-scroll");
                }

                $('body').trigger('header_content_change');
            },

            state: function() {
                if ($("#aui-header-content-box").html() === "") {
                    return false;
                } else {
                    return "active";
                }
            }

        },




        lazy_load: function(load_now, element, is_list, options) {

            /*
             * Lazy load images that have the data-img-src attribute.
             *
             * Note: This function can cause some performance issues if there are
             * many images - this is because of the offset method that's run for each element.
             *
             */

            var elements = element ? $(element).find("[data-img-src]").not("[data-lazy-loaded]") : $("[data-img-src]").not("[data-lazy-loaded]"),
                resize_timeout = {},
                settings = $.extend({}, options);

            if (elements.length > 0) {
                load();

                if(load_now) {
                    elements.each(function() {
                        if($(this).attr("src") !== $(this).attr("data-img-src")) {
                            $(this).attr("src", $(this).attr("data-img-src"));
                            $(this).trigger("aui_lazy_load");
                        }
                    });
                }
            }

            function load() {

                var scroll_offset = $("#aui-content").offset(),
                    top_offset_to_load = (window.aui.meta.window_height - scroll_offset.top + 0) * 2;


                for (var i = 0; elements.length > i; i++) {
                    if($(elements[i]).offset().top <= top_offset_to_load) {
                        var image_source = $(elements[i]).attr("src"),
                            image_data_source = $(elements[i]).attr("data-img-src");

                        if(image_source !== image_data_source) {
                            $(elements[i]).attr("src", image_data_source).attr("data-lazy-loaded");
                            $(elements[i]).trigger("aui_lazy_load");
                        }
                    } else if (is_list) {
                        // we know it's a list so anything beyond this will be out of view anyway
                        break;
                    }
                }

            }

        },



        keyboard_shortcut: {
            check_condition: function(shortcut) {
                var condition = true;

                if (window.aui.utils.is_function(shortcut.condition)) {
                    if (!shortcut.condition()) {
                        condition = false;
                    }
                } else if (shortcut.condition) {
                    console.log("Warning: This keyboard shortcut has an invalid condition. The condition must be a function.");
                }

                if (!shortcut.allow_for_popup && window.aui.overlay_box.state()) {
                    // FIXME: temp fix
                    if ($(".aui-overlay-cover-background").length) {
                        condition = false;
                    }
                }

                return condition;
            },
            shortcut_modifiers_active: function(shortcut, event) {

                var modifiers_are_active = true;
                var possible_modifiers = ["altKey", "shiftKey", "metaKey"];

                if (shortcut.modifier_keys) {
                    modifiers_are_active = false;

                    for (var x = 0; shortcut.modifier_keys.length > x; x++) {
                        // check that all modifier keys are pressed
                        if (event[shortcut.modifier_keys[x]]) {
                            modifiers_are_active = true;
                        } else {
                            modifiers_are_active = false;
                            break;
                        }
                    }

                    var ii = possible_modifiers.length;
                    while (ii--) {
                        if (event[possible_modifiers[ii]] && $.inArray(possible_modifiers[ii], shortcut.modifier_keys) < 0) {
                            modifiers_are_active = false;
                        }
                    }
                } else if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
                    modifiers_are_active = false;
                }

                return modifiers_are_active;

            },
            check_if_shortcut_should_be_executed: function(shortcut, event, input_focussed) {
                var condition = false;

                condition = this.check_condition(shortcut);

                if (input_focussed && !shortcut.ignore_inputs) {
                    condition = false;
                }

                return condition;
            },
            shortcut_keycode_pressed: function(shortcut, event) {
                var keycode_pressed = (parseInt(shortcut.key_code) === event.keyCode) || ($.isArray(shortcut.key_code) && $.inArray(event.keyCode, shortcut.key_code) !== -1);
                return keycode_pressed
            },

            execute_shortcut: function(shortcut, event, input_focussed) {
                var that = this;
                var shortcut_has_modifiers = shortcut.modifier_keys;
                var execute_shortcut = that.check_if_shortcut_should_be_executed(shortcut, event, input_focussed);

                if (execute_shortcut) {

                    // these if statements allow the browser's keyboard shortcuts to work
                    if (shortcut.prevent_default) {
                        if (!shortcut_has_modifiers) {
                            if (!event.shiftKey && !event.metaKey && !event.altKey) {
                                event.preventDefault();
                                event.stopImmediatePropagation();
                            }
                        } else {
                            event.preventDefault();
                            event.stopImmediatePropagation();
                        }
                    }

                    var options = {};
                    if (shortcut.options) {
                        options = shortcut.options;
                    }
                    options.event = event;
                    shortcut.method(options);
                    return true;

                } else {
                    return false;
                }
            },
            update_event_listener: function() {

                var that = this;

                $(document).off("keyboard_shortcut");
                $(document).on("keyboard_shortcut", function (e, event) {

                    var shortcuts = window.aui.keyboard_shortcuts;
                    var input_focussed = window.aui.check_if_input_in_focus();
                    var shortcuts_overriden = false;

                    // get an array of shortcuts that are relevant to the key that's pressed
                    var active_shortcuts = shortcuts.filter(function(shortcut) {
                        return that.shortcut_keycode_pressed(shortcut, event) && that.shortcut_modifiers_active(shortcut, event);
                    });

                    var primary_shortcut = active_shortcuts.filter(function(shortcut) {
                        return shortcut.override_identical_keycodes;
                    });

                    if (primary_shortcut.length == 1) {
                        shortcuts_overriden = that.execute_shortcut(primary_shortcut[0], event, input_focussed);
                    }

                    if (!shortcuts_overriden) {
                        active_shortcuts.forEach(function(shortcut) {
                            that.execute_shortcut(shortcut, event, input_focussed);
                        });
                    }
                });
            },
            set_keyboard_shortcuts: function(keyboard_shortcuts) {

                /*
                 * DESCRIPTION
                 * ========================================================
                 * checks to make sure the shortcuts are valid and pushes them to the
                 * aui.keyboard_shortcuts array.
                 *
                 * ARGUMENTS
                 * ========================================================
                 *
                 * keyboard_shortcuts
                 * ----------------------------------------------------------------------------------------------------
                 * type: array
                 * description: array of objects. each object contains data for the shortcut
                 *
                 *
                 * SHORTCUT OBJECT PROPERTIES
                 * ========================================================
                 *
                 * name
                 * ----------------------------------------------------------------------------------------------------
                 * type: string
                 * description: name of the keyboard shortcut. Just to make it easier to
                 * access the object if need be. Should be unique.
                 *
                 * key_code
                 * ----------------------------------------------------------------------------------------------------
                 * type: int
                 * description: javascript key code of the key you want to assign the shortcut to
                 *
                 * modifier_keys
                 * ----------------------------------------------------------------------------------------------------
                 * type: array
                 * description: array of modifier key events as strings. These must be the
                 * same as the event properties, for example event.metaKey
                 *
                 * method
                 * ----------------------------------------------------------------------------------------------------
                 * type: function
                 * description: function to be called when key is pressed
                 *
                 * condition
                 * ----------------------------------------------------------------------------------------------------
                 * type: function
                 * description: function that returns a bool value - if the value is true, the
                 * shortcut method will be executed. If not, nothing happens.
                 *
                 * ignore_inputs
                 * ----------------------------------------------------------------------------------------------------
                 * type: bool
                 * description: by default, keyboard shortcuts aren't fired if an input has focus
                 * this option will make them work regardless
                 *
                 * allow_for_popup
                 * ----------------------------------------------------------------------------------------------------
                 * type: bool
                 * description: keyboard events are suppressed by default if there's a popup on the page.
                 * Set this to true to allow the event inside a popup.
                 *
                 *
                */
                if (!window.aui.keyboard_shortcuts) {
                    window.aui.keyboard_shortcuts = [];
                }

                for (var i = 0; keyboard_shortcuts.length > i; i++) {
                    var existing_shortcut = window.aui.utils.get_item_by_property(aui.keyboard_shortcuts, keyboard_shortcuts[i].name, "name");
                    if (keyboard_shortcuts[i].method && !this.shortcut_exists(keyboard_shortcuts[i])) {
                        if (keyboard_shortcuts[i].prevent_default !== false) {
                            keyboard_shortcuts[i].prevent_default = true;
                        }
                        if (existing_shortcut) {
                            $.extend(true, existing_shortcut, keyboard_shortcuts[i]);
                        } else {
                            window.aui.keyboard_shortcuts.push(keyboard_shortcuts[i]);
                        }
                    } else {
                        console.log("Warning: you have specified a keyboard shortcut without a valid method.");
                    }
                }

                this.update_event_listener();
            },
            shortcut_exists: function(shortcut) {
                // dependencies
                var _shortcuts = window.aui.keyboard_shortcuts,
                    _utils = window.aui.utils;

                var return_value = false;

                if (_shortcuts) {
                    for (var i = 0, l = _shortcuts.length; l > i; i++) {
                        if (_shortcuts[i].key_code === shortcut.key_code) {
                            if (_shortcuts[i].modifiers) {
                                var l = _shortcuts[i].modifiers.length;
                                while (l--) {
                                    if (_utils.in_array(_shortcuts[i].modifiers[l], shortcut.modifiers)) {
                                        return_value = true;
                                    }
                                }
                            }
                        }
                    }
                }

                return return_value;

            },
            disable: function() {
                $(document).off("keyboard_shortcut");
            },
            enable: function() {
                this.update_event_listener();
            }
        },


        _slide: function(data, options) {
            var default_settings = {
                    id: window.aui.utils.get_uid(),
                    records_per_page: undefined,
                    page_number: 1,
                    padding: 0,
                    slide_template: "",
                    animation: "fade",
                    animation_speed: 800,
                    total_slides_number: data ? data.length : undefined,
                    next_slide_button_class: "aui-icon-arrow-right-bold",
                    previous_slide_button_class: "aui-icon-arrow-left-bold",
                    slide_index_offset: 0
                };
                
            var artworks_slider = window.conf && window.conf.name == 'artworks';
            // Duncan: captions were causing images to display incorrectly, so reverting for now
            // var main_image_html = (artworks_slider)? "<div class='artworks-image-slider-container-for-caption'><img data-src='{{img}}' class='aui-slide-image {{img_classes}}' src='' {{{img_attributes}}} ><span class='artworks-slide-image-caption'>{{main_image_caption}}</span></div>": "<img data-src='{{img}}' class='aui-slide-image {{img_classes}}' src='' {{{img_attributes}}} >";
            var main_image_html = "<img data-src='{{img}}' class='aui-slide-image {{img_classes}}' src='' {{{img_attributes}}} >";
            
            default_settings.slide_template = ""+
                "<div class='aui-slides aui-slides-type-{{settings.slide_type}} {{settings.slide_class}}' data-slides-id='{{settings.id}}'>"+
                    "<button class='aui-slide-close'><i class='aui-icon-cross'></i></button>"+
                    "<div class='aui-slides-container'>"+
                        "{{#each slides}}"+
                            "<div class='aui-slide' data-slide-id='{{id}}' style='padding: {{settings.padding}}px;'>"+
                                "<div class='aui-slide-image-2'><img data-src='{{img}}' class='xaui-slide-image-2' src=''></div>"+
                                "<div class='aui-slide-content'>"+
                                    "<div class='aui-slide-image-container'>"+
                                        main_image_html +
                                    "</div>"+
                                    "<div class='aui-caption'>{{{caption}}}</div>"+
                                    "{{{additional_content}}}"+
                                "</div>"+
                            "</div>"+
                        "{{/each}}"+
                    "</div>"+
                    "<div class='aui-slide-footer'>"+
                        "<div class='aui-slide-custom-footer-content'>{{{settings.footer_content}}}</div>"+
                        "<div class='simple-slide-count'>"+
                            "<button class='aui-slide-previous'><i class='{{settings.previous_slide_button_class}}'></i>Previous</button>"+
                            "<div class='aui-slide-numbers-container'>"+
                                "<span {{#if settings.enable_page_number_input}}contenteditable='true'{{/if}} class='aui-slide-number-field'>1</span>"+
                                "<span class='aui-slide-pagination-text'>of</span><span class='aui-number-of-slides'>{{settings.total_slides_number}}</span>"+
                            "</div>"+
                            "<button class='aui-slide-next'><i class='{{settings.next_slide_button_class}}'></i>Next</button>"+
                        "</div>"+
                    "</div>"+
                "</div>";

            var INSTANCE = {
                data: data,
                settings: $.extend({}, default_settings, options),

                event_handlers: function() {
                    var that = this,
                        slides_element = this.get_slides_element();

                    slides_element.find(".aui-slide-next").off("click.aui_slide_next").on("click.aui_slide_next", function() {
                        that.load_next();
                    });
                    slides_element.find(".aui-slide-previous").off("click.aui_slide_prev").on("click.aui_slide_prev", function() {
                        that.load_previous();
                    });
                },

                // methods
                load_slide: function(slide_arg, animation_speed) {
                    var that = this,
                        slide = slide_arg || {},
                        new_slide_index = this.get_slide_index(slide),
                        new_slide_element = this.get_slide_element(slide.id),
                        active_slide = this.get_active_slide() || {},
                        active_slide_element = this.get_slide_element(active_slide.id),
                        next_slide_index = new_slide_index + 2,
                        next_slide = this.get_slide_by_index(next_slide_index),
                        next_slide_element = this.get_slide_element(next_slide.id),
                        promise = $.Deferred(),
                        event_options = {
                            new_slide: slide,
                            new_slide_index: new_slide_index,
                            new_slide_element: new_slide_element,
                            active_slide: active_slide,
                            active_slide_element: active_slide_element
                        };

                    this.on_before_slide(event_options);

                    active_slide.active = undefined;
                    slide.active = true;

                    // load next slide image
                    var img = next_slide_element.find("img[data-src]");
                        img.attr("src", img.data("src"));

                    this.load_slide_in_dom(new_slide_element, active_slide_element, animation_speed).done(function() {
                        that.on_after_slide(event_options);
                        promise.resolve();
                    });
                    
                    // this is a custom event to tell the browser that the slide is active and usable - this is primarily used in roomview PV but listeners can be added anyhwere the slides exist
                    // this only happens when the above resolves
                    new_slide_element.trigger("slideIsActive");
                    that.on_slide(event_options);

                    return promise;

                },
                load_slide_in_dom: function(new_slide_element, current_active_slide_element, animation_speed) {
                    var that = this,
                        promise = $.Deferred(),
                        anim_spd = animation_speed || this.settings.animation_speed,
                        delayed_activate = window.aui.utils.debounce(function() {
                            // remove class when animation finished
                            current_active_slide_element.removeClass("aui-was-active");
                            current_active_slide_element.removeClass("aui-active");
                            new_slide_element.removeClass("aui-will-be-active");
                            new_slide_element.addClass("aui-active");
                            promise.resolve();
                        },anim_spd);

                    if (new_slide_element.length) {
                        current_active_slide_element.addClass("aui-was-active");
                        current_active_slide_element.css({
                            animation: "aui-slide-transition-out "+(anim_spd/1000)+"s ease"
                        });
                        new_slide_element.addClass("aui-will-be-active");
                        new_slide_element.css({
                            animation: "aui-slide-transition-in "+(anim_spd/1000)+"s ease"
                        });

                        delayed_activate();
                        

                        // img lazy loading
                        var img = new_slide_element.find("img[data-src]");
                        img.attr("src", img.data("src"));
                    }
                    return promise;

                },
                load_slide_by_id: function(id, animation_speed) {
                    var slide = this.get_slide_by_id(id);
                    return this.load_slide(slide, animation_speed);
                },
                load_slide_by_index: function(index, animation_speed) {
                    var slide = this.get_slide_by_index(index);
                    if (index >= 0 && index <= this.data.length) {
                        if (slide.img) {
                            return this.load_slide(slide, animation_speed);
                        } else {
                            // if there's no image try the next/prev slide
                            return this.load_slide_by_index(this.settings.direction == "prev" ? index - 1 : index + 1);
                        }
                    }
                },

                // get data
                get_slide_index: function(slide) { return this.data.indexOf(slide); },
                get_slide_by_index: function(index) {return this.data[index-1] || {};},
                get_slide_by_id: function(id) {return window.aui.utils.get_item_by_id(this.data, id);},

                // get dom elements
                get_active_slide: function() {return this.data.filter(function(slide) {return slide.active;})[0];},
                get_slide_element: function(id) {return this.get_slides_element().find("[data-slide-id='"+id+"']");},
                get_slides_element: function() {return $("[data-slides-id='"+INSTANCE.id+"']");},
                get_active_slide_element: function() {
                    var slides_element = this.get_slides_element(),
                        active_slide_element = slides_element.find(".aui-slide.aui-active");
                    return active_slide_element;
                },
                get_html: function(page_number) {
                    var template = this.settings.slide_template;
                    return Handlebars.compile(template)({slides: this.data, settings: this.settings});
                },

                // events
                on_before_slide: function(options) {
                    if (window.aui.utils.is_function(this.settings.on_before_slide)) {
                        this.settings.on_before_slide.apply(this, [options]);
                    }
                },
                on_slide: function(options) {
                    this.element = this.get_slides_element();
                    this.element.find(".aui-slide-number-field").html(options.new_slide_index+1 + this.settings.slide_index_offset);
                    this.active_slide = options.new_slide;
                    if (window.aui.utils.is_function(this.settings.on_slide)) {
                        this.settings.on_slide.apply(this, [options]);
                    }
                },
                on_after_slide: function(options) {
                    if (window.aui.utils.is_function(this.settings.on_after_slide)) {
                        this.settings.on_after_slide.apply(this, [options]);
                    }
                },
                on_end_of_page: function(new_page) {
                    if (window.aui.utils.is_function(this.settings.on_end_of_page)) {
                        this.settings.on_end_of_page.apply(this, [new_page]);
                    }
                },

                // convenience methods
                load_next: function(index) {
                    var active_slide = this.get_active_slide(),
                        active_slide_index = typeof index !== 'undefined' ? index : this.get_slide_index(active_slide),
                        new_slide_index = active_slide_index + 1,
                        new_slide = this.get_slide_by_index(new_slide_index+1);

                    if (active_slide_index+1 == this.data.length) {
                        this.on_end_of_page("next");
                    } else {
                        if (new_slide.img) {
                            this.load_slide(new_slide);
                        } else {
                            this.load_next(new_slide_index);
                        }
                    }
                },
                load_previous: function(index) {
                    var active_slide = this.get_active_slide(),
                        active_slide_index = this.get_slide_index(active_slide),
                        new_slide_index = typeof index !== 'undefined' ? index : active_slide_index,
                        new_slide = this.get_slide_by_index(new_slide_index);

                    if (new_slide_index >= 0) {
                        if (new_slide.img) {
                            this.load_slide(new_slide);
                        } else {
                            this.load_previous(new_slide_index - 1);
                        }
                    } else {
                        this.on_end_of_page("prev");
                    }
                },

                start_auto_slide: function() {
                    var that = this;
                    this.auto_slide_interval = window.setInterval(function() {
                        var active_slide = that.get_active_slide(),
                            slide_index = that.get_slide_index(active_slide);
                        that.load_next(slide_index);
                    }, 1200);
                },
                stop_auto_slide: function() {
                    window.clearInterval(this.auto_slide_interval);
                }
            };

            INSTANCE.id = INSTANCE.settings.id;

            return INSTANCE;
        },



        overlay_slideshow: function(data, options) {
            var that = this,
                methods,
                slide_settings = $.extend({
                    id: "aui-slideshow-overlaybox",
                    slide_type: "overlay",
                    elements_to_slide_down: ".aui-slide-footer, .aui-caption",
                    elements_to_slide_up: ".aui-slide-close",
                    hide_controls_animation_speed: 400,
                    auto_hide_controls: false
                }, options,
                {
                    //slide_class: options.show_details ? ('aui-slide-show-details ' + options.slide_class) : options.slide_class,
                    on_after_slide: function(data) {
                        var slides_element = slides_instance.get_slides_element();
                        slides_element.find(".aui-slide-details-show-btn")
                            .off("click.aui_slide_details_show")
                            .on("click.aui_slide_details_show", function() {
                                // click through to the info view
                                if (!slides_element.hasClass("aui-slide-show-details")) {
                                    methods.show_slide_details(true);
                                } else {
                                    methods.hide_slide_details();
                                }
                            });

                        if (options && window.aui.utils.is_function(options.on_after_slide)) {
                            options.on_after_slide.apply(slides_instance, [data]);
                        }
                    },
                    on_before_slide: function(data) {
                        if (methods.controls_visibility === false) {
                            // make sure controls are always hidden 100% (otherwise it will only partially hide captions that are taller than the previously hidden one)
                            data.new_slide_element.find(slide_settings.elements_to_slide_down).css("transform", "translateY(100%)")
                        }

                        if (options && window.aui.utils.is_function(options.on_before_slide)) {
                            options.on_before_slide.apply(slides_instance, [data]);
                        }
                    }
                }),
                slides_instance = window.aui._slide(data, slide_settings);

            methods = $.extend(slides_instance, {
                close: function() {
                    window.aui.overlay_box.close("aui-slideshow-overlaybox");
                },
                show_controls: function() {
                    var slides_element = slides_instance.get_slides_element(),
                        elements_to_hide = slides_element.find(slide_settings.elements_to_slide_up).add(slides_element.find(slide_settings.elements_to_slide_down));

                    slides_element.removeClass("aui-hide-slideshow-controls");
                    elements_to_hide.css({
                        transform: "",
                        opacity: ""
                    });

                    this.controls_visibility = true;
                },
                limit_keyboard: function() {
                    var slides_element = slides_instance.get_slides_element(),
                        active_slide_element = slides_element.find(".aui-active"),
                        active_roomview = $('body')[0].classList.contains("roomview-active");
                    return active_roomview;
                },
                hide_controls: function() {
                    var slides_element = slides_instance.get_slides_element(),
                        elements_to_slide_up = slides_element.find(slide_settings.elements_to_slide_up),
                        elements_to_slide_down = slides_element.find(slide_settings.elements_to_slide_down),
                        elements_max_height = that.get_elements_max_height(elements_to_slide_down.add(elements_to_slide_down));

                    slides_element.addClass("aui-hide-slideshow-controls");

                    elements_to_slide_up.css({
                        transition: "transform "+(slide_settings.hide_controls_animation_speed/1000)+"s ease, opacity "+(slide_settings.hide_controls_animation_speed/1000)+"s ease",
                        transform: "translateY(-"+elements_max_height+"px)"
                        //opacity: "0"
                    });
                    elements_to_slide_down.css({
                        transition: "transform "+(slide_settings.hide_controls_animation_speed/1000)+"s ease, opacity "+(slide_settings.hide_controls_animation_speed/1000)+"s ease",
                        transform: "translateY("+elements_max_height+"px)"
                        //opacity: "0"
                    });

                    this.controls_visibility = false;
                },
                toggle_controls: function(slideshow) {
                    // returns true if show, false if hide
                    var slides_element = slides_instance.get_slides_element();
                    if (slides_element.hasClass("aui-hide-slideshow-controls")) {
                        this.show_controls();
                        return true;
                    } else {
                        this.hide_controls();
                        return false;
                    }
                },
                disable_toggle_controls: function() {
                    this.disable_toggle_controls_state = true;
                },
                enable_toggle_controls: function() {
                    this.disable_toggle_controls_state = false;
                },

                // slide details
                show_slide_details: function(animate) {
                    var slides_element = slides_instance.get_slides_element(),
                        active_slide_element = slides_element.find(".aui-active"),
                        slide_img_container = slides_element.find(".aui-active .aui-slide-image-container"),
                        slide_img = slide_img_container.find(".aui-slide-image");


                    // disable toggle controls
                    this.disable_toggle_controls();

                    var img_2 = active_slide_element.find(".aui-slide-image-2"),
                        old_img_offset = slide_img.offset() || {};

                    // animate the duplicated image to the top (transition set in css)
                    if (old_img_offset.top > 0) {
                        img_2.css("top", old_img_offset.top + "px").attr("data-original_position", old_img_offset.top + "px");
                    }
                    if (animate) {
                        slides_element.addClass("aui-slide-details-animate");
                    }

                    slides_element.addClass("aui-slide-show-details");
                    slides_element.find(".aui-slide-details-show-btn").text("Hide info");

                    this.on_show_slide_details();

                    window.setTimeout(function() {
                        slides_element.removeClass("aui-slide-details-animate");
                    }, 1000);
                },
                on_show_slide_details: function(active_slide_el) {
                    var that = this,
                        active_slide_element = active_slide_el || slides_instance.element.find(".aui-active"),
                        slide_img_container = active_slide_element.find(".aui-slide-image-container"),
                        slide_img = slide_img_container.find(".aui-slide-image"),
                        img_2 = active_slide_element.find(".aui-slide-image-2"),
                        img_height = slide_img.height(),
                        info_element = active_slide_element.find(".aui-slide-details");

                    if (window.aui.meta.window_width <= 880) {
                        img_2.css({ top: "" });
                        if (img_height > window.aui.meta.window_height - 130) {
                            var height = info_element.height(),
                                top_offset = info_element.offset().top;

                            active_slide_element.find(".aui-slide-content").animate({  scrollTop: top_offset > window.aui.meta.window_height ? Math.abs(window.aui.meta.window_height - top_offset) : 0 + "px" }, 0);
                            var scrolltop = height > 300 ? 300 : height + (top_offset > window.aui.meta.window_height ? Math.abs(window.aui.meta.window_height - top_offset) : 0);
                            active_slide_element.find(".aui-slide-content").animate({
                                scrollTop:  (scrolltop > window.aui.meta.window_height ? window.aui.meta.window_height : scrolltop) - 40 + "px"
                            }, 800);
                        }
                    }
                },
                hide_slide_details: function() {
                    var slides_element = slides_instance.get_slides_element(),
                        active_slide_element = slides_element.find(".aui-active"),
                        slide_img_container = slides_element.find(".aui-active .aui-slide-image-container"),
                        slide_img = slide_img_container.find(".aui-slide-image"),
                        img_2 = active_slide_element.find(".aui-slide-image-2");

                    slides_element.addClass("aui-slide-details-animate-out");
                    slides_element.removeClass("aui-slide-show-details");
                    slides_element.find(".aui-slide-details-show-btn").text("Show info");

                    // disable toggle controls
                    this.enable_toggle_controls();

                    if (parseInt(img_2.attr("data-original_position") || slide_img.offset().top) > 0) {
                        img_2.css("top", img_2.attr("data-original_position") || slide_img.offset().top + "px");
                    }

                    window.setTimeout(function() {
                        slides_element.removeClass("aui-slide-details-animate-out");
                    }, 1000);
                }
            });

            that.overlay_slideshows.forEach(function(obj, index, array) {
                if (obj.id == slide_settings.id) {
                    array.splice(index, 1);
                }
            });

            that.overlay_slideshows.push(methods);

            window.aui.overlay_box.load({
                content: slides_instance.get_html(),
                fullscreen: (slide_settings.width || slide_settings.height) ? false : true,
                id: slide_settings.id,
                buttons: false,
                no_padding: true,
                box_width: slide_settings.width,
                box_height: slide_settings.height,
                css_class: "aui-overlay-box-slideshow " + (slide_settings.css_class||""),
                animation: slides_instance.settings.animation,
                animation_speed_in: slides_instance.settings.animation_speed_in,
                animation_speed_out: slides_instance.settings.animation_speed_out,
                transition_speed: 0,
                scroll_height: false,
                close_on_click_outside: false,
                on_before_close: function(options) {
                    if (window.aui.utils.is_function(slide_settings.on_before_close)) {
                        slide_settings.on_before_close(options);
                    }
                },
                on_close: function(options) {
                    methods.state = false;
                    methods.top_level_slideshow = false;
                    var i = that.overlay_slideshows.length
                    while (i--) {
                        var obj = that.overlay_slideshows[i];
                        if (obj.state) {
                            obj.top_level_slideshow = true;
                            break;
                        }
                    };
                    if (window.aui.utils.is_function(slide_settings.on_close)) {
                        slide_settings.on_close(options);
                    }

                    var active_slides = slides_instance.data.filter(function(obj) { return obj.active; });
                    if (active_slides.length) {
                        active_slides[0].active = undefined;
                    }
                },
                on_load: function() {
                    var slide_load;

                    if (slide_settings.initial_slide_id) {
                        slide_load = methods.load_slide_by_id(slide_settings.initial_slide_id, 1);
                    } else {
                        slide_load = methods.load_slide_by_index(slide_settings.initial_slide_index || 1, 0);
                    }
                    slides_instance.event_handlers();
                    slides_instance.get_slides_element().addClass("aui-slides-loading");

                    methods.state = true;
                    that.overlay_slideshows.forEach(function(obj) {
                        obj.top_level_slideshow = false;
                    });
                    methods.top_level_slideshow = true;

                    // event handlers to show/hide controls
                    var slides_element = slides_instance.get_slides_element(),
                        clicked_off = false,
                        clicked_toggle = false,
                        debounced_hide_controls = window.aui.utils.debounce(function() {
                            //if (!clicked_toggle) {
                                methods.hide_controls();
                            //}
                        }, 7000);

                    if (slide_settings.auto_hide_controls) {
                        debounced_hide_controls();
                    }

                    if (slide_load) {
                        slide_load.done(function() {
                            if (slide_settings.show_details) {
                                methods.show_slide_details();
                            }
                            slides_instance.get_slides_element().removeClass("aui-slides-loading");
                        });
                    } else {
                        slides_instance.get_slides_element().removeClass("aui-slides-loading");
                    }



                    var is_touch = false,
                        mouse_positions,
                        update_mouse_positions = window.aui.utils.debounce(function(event) {
                            mouse_positions = {
                                x: event.clientX,
                                y: event.clientY
                            }
                        }, 60);

                    slides_element.off("touchstart.aui_os_touch").on("touchstart.aui_os_touch", function(event) {
                        is_touch = true;
                    });
                    slides_element.off("mousemove.aui_os_move").on("mousemove.aui_os_move", function(event) {
                        var show_controls = true;
                        if (mouse_positions) {
                            var min_difference = 1,
                                difference_x = Math.abs(mouse_positions.x-event.clientX),
                                difference_y = Math.abs(mouse_positions.y-event.clientY);

                            if (difference_x < min_difference || difference_y < min_difference) {
                                show_controls = false;
                            }
                        }
                        if (!is_touch) {
                            //if (!clicked_off) {
                            if (show_controls) {
                                methods.show_controls();
                            }
                            //}
                            if (slide_settings.auto_hide_controls) {
                                debounced_hide_controls();
                            }

                            update_mouse_positions(event);

                        }
                        is_touch = false;
                    });
                    slides_element.find(".aui-slide").off("click.aui_os_toggle_controls").on("click.aui_os_toggle_controls", function() {
                        if (!methods.disable_toggle_controls_state) {
                            clicked_off = !methods.toggle_controls();
                            clicked_toggle = true;
                        }
                    });
                    slides_element.find(".aui-slide-close").off("click.aui_os_close").on("click.aui_os_close", function() {
                        methods.close();
                    });

                    // touch events
                    slides_element.off("swiperight.aui_prev_slide"+slide_settings.id).on("swiperight.aui_prev_slide"+slide_settings.id, function(event) {
                        //event.stopImmediatePropagation();
                        var limit_keyboard = methods.limit_keyboard();
                        if (methods.state && !limit_keyboard) {
                            methods.load_previous();
                        }
                    });
                    slides_element.off("swipeleft.aui_next_slide"+slide_settings.id).on("swipeleft.aui_next_slide"+slide_settings.id, function(event) {
                        //event.stopImmediatePropagation();
                        var limit_keyboard = methods.limit_keyboard();
                        if (methods.state && !limit_keyboard) {
                            methods.load_next();
                        }
                    });

                    var shortcuts = [
                        {
                            name: 'aui_select_next_overlay_slide-'+slide_settings.id,
                            key_code: 39,
                            method: function() {
                                methods.load_next();
                            },
                            condition: function() {
                                var limit_keyboard = methods.limit_keyboard();
                                var condition = methods.top_level_slideshow && window.aui.overlay_box.state(slide_settings.id) && !limit_keyboard;
                                return condition;
                            },
                            allow_for_popup: true
                        },
                        {
                            name: 'aui_select_prev_overlay_slide-'+slide_settings.id,
                            key_code: 37,
                            method: function() {
                                methods.load_previous();
                            },
                            condition: function() {
                                var limit_keyboard = methods.limit_keyboard();
                                var condition = methods.top_level_slideshow && window.aui.overlay_box.state(slide_settings.id) && !limit_keyboard;
                                return condition;
                            },
                            allow_for_popup: true
                        }

                    ];

                    window.aui.keyboard_shortcut.set_keyboard_shortcuts(shortcuts);


                    if (window.aui.utils.is_function(slide_settings.on_load)) {
                        slide_settings.on_load();
                    }
                }
            });

            return methods;
        },
        overlay_slideshows: [],

        prevent_zoom_on_input: function() {

            var viewport = document.querySelector("meta[name=viewport]");

            $("input").focus(function() {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, minimal-ui');
                setTimeout(function() {
                    viewport.setAttribute('content', 'width=device-width, minimum-scale=0.5, maximum-scale=1.5, initial-scale=1, minimal-ui');
                }, 500);
            });

            $("input").blur(function() {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, minimal-ui');
                viewport.setAttribute('content', 'width=device-width, minimum-scale=0.5, maximum-scale=1.5, initial-scale=1, minimal-ui');
            });
        },

        get_elements_max_height: function(elements) {
            var element_heights = [];
            elements.each(function() {
                element_heights.push($(this).outerHeight());
            });
            return Math.max.apply(Math, element_heights);
        },

        check_if_input_in_focus: function(element) {
            var el = $(element)[0] || document.activeElement,
                input_focus = false;

            if (el) {
                input_focus = !(el.nodeName !== "INPUT" && el.nodeName !== "TEXTAREA" && !el.hasAttribute("contenteditable"));
            }

            return input_focus;
        },

        element_position: function(element, relative) {

            /*
             * Returns positions of the given element.
             *
             * ARGUMENTS
             * ========================================================
             *
             * element
             * ----------------------------------------------------------------------------------------------------
             * type: string or jquery object
             * description: selector of the element you want to check
             *
             * relative
             * ----------------------------------------------------------------------------------------------------
             * type: boolean
             * description: set true if the element is part of a scrolling area, and you want the
             * positions to be relative to the scrolling content
             *
             *
            */

            var element_obj = $(element);
            if (element_obj.length > 1) {
                console.log("%c aui error: Cannot specify position of multiple elements. You must use a unique selector.", window.aui.error_style);
                return false;
            } else if (!element_obj.length) {
                console.log("%c aui error: Element is undefined.", window.aui.error_style);
                return false;
            }

            var element_scrolls = (element_obj.closest(aui.scroll_element).length > 0);
            var element_height = element_obj.outerHeight();
            var element_width = element_obj.outerWidth();
            var element_offsets = element_obj.offset();

            var offset_compensation = {
                top: 0,
                left: 0
            };

            var relative_offset = {
                top: window.aui.meta.scroll_position,
                left: 0
            }

            if (relative) {
                offset_compensation = relative_offset;
            }

            var element_position = {
                top: {
                    top_edge: offset_compensation.top + element_offsets.top,
                    bottom_edge: offset_compensation.top + element_offsets.top + element_height
                },
                left: {
                    left_edge: element_offsets.left,
                    right_edge: element_offsets.left + element_width
                },
                right: {
                    left_edge: window.aui.meta.window_width - element_offsets.left,
                    right_edge: window.aui.meta.window_width - (element_offsets.left + element_width)
                },
                bottom: {
                    top_edge: window.aui.meta.window_height - (offset_compensation.top + element_offsets.top),
                    bottom_edge: window.aui.meta.window_height - (offset_compensation.top + element_offsets.top + element_height)
                }
            };
            return element_position;
        },

        element_is_offscreen: function(element, offsets) {

            /*
             * Checks if the element specified is outside the viewport.
             * Most of the work is done in the element_position() method above.
             *
             * ARGUMENTS
             * ==============================================
             *
             * element
             * -----------------------------------------------------------------------------------
             * type: string or jquery object
             * descripttion: selector of the element you want to check
             *
             * offset
             * -----------------------------------------------------------------------------------
             * type: object
             * description: specify an offset, to alter the size of the 'virtual' viewport.
             * example:
             *
             * offsets = {
             *     top: 100
             * }
             *
             * window.aui.element_is_offscreen("#my_element", offsets)
             *
             * This means that as far as this function is concerned, an element whose top position is
             * anything less than 100px from the top of the viewport is considered off screen.
             *
            */
            var element_position = window.aui.element_position(element),
                element_offscreen = false;

            if (element_position) {
                $.each(element_position, function(position_key, position_obj) {

                    var offset = 0;

                    if (offsets) {
                        if (offsets[position_key]) {
                            offset = offsets[position_key];
                        }
                    }

                    $.each(position_obj, function(edge_key, edge_value) {

                        if (edge_value < 0 + offset) {

                            if (!element_offscreen) {
                                element_offscreen = {};
                            }

                            if (!element_offscreen[position_key]) {
                                element_offscreen[position_key] = {}
                            }

                            element_offscreen[position_key][edge_key] = true;
                        }
                    });
                });
            }

            return element_offscreen;
        },

        element_is_onscreen: function(element, offsets) {

            /*
             * Checks if the element specified is inside the viewport.
             * Most of the work is done in the element_position() method above.
             *
             * ARGUMENTS
             * ==============================================
             *
             * element
             * -----------------------------------------------------------------------------------
             * type: string or jquery object
             * descripttion: selector of the element you want to check
             *
             * offset
             * -----------------------------------------------------------------------------------
             * type: object
             * description: specify an offset, to alter the size of the 'virtual' viewport.
             * example:
             *
             * offsets = {
             *     top: 100
             * }
             *
             * window.aui.element_is_offscreen("#my_element", offsets)
             *
             * This means that as far as this function is concerned, an element whose top position is
             * anything less than 100px from the top of the viewport is considered off screen.
             *
            */

            var element_position = window.aui.element_position(element),
                element_onscreen = false;

            if (element_position.top.top_edge && element_position.top.top_edge < window.aui.meta.window_height && element_position.top.bottom_edge > 0) {
                element_onscreen = true;
            }

            return element_onscreen;
        },

        scroll_to_element: function(element, transition_speed) {

            /*
             * Scrolls to a given element on the page, and animates the scroll
             * using the given transition_speed
             *
             * ARGUMENTS
             * ==============================================
             *
             * element
             * -----------------------------------------------------------------------------------
             * type: string or jquery object
             * descripttion: selector of the element you want to scroll to
             *
             * transition_speed
             * -----------------------------------------------------------------------------------
             * type: int
             * description: specify in ms the speed of the scroll transition.
             *
             *
            */

            var selected_element = $(element);
            var wrapper_scrolltop = window.aui.meta.scroll_position;
            var selected_element_offsets = $(selected_element).offset() || {};
            var selected_element_offset = wrapper_scrolltop + selected_element_offsets.top;
            var selected_element_height = parseInt(selected_element.height());

            var scroll_transition_time = transition_speed || 0;

            // transition speed is throttled, to prevent lagging behind when scroll happens often

            if (window.aui.last_scroll_to_element) {
                if (window.aui.utils.get_time() < window.aui.last_scroll_to_element + 100) {
                    scroll_transition_time = 5;
                } else if (window.aui.utils.get_time() < window.aui.last_scroll_to_element + 250) {
                    scroll_transition_time = 200;
                } else if (window.aui.utils.get_time() < window.aui.last_scroll_to_element + 350) {
                    scroll_transition_time = 400;
                }
            }

            if (selected_element_offset + selected_element_height > wrapper_scrolltop + window.aui.meta.window_height - 100) {
                // element is below, scroll up
                $(window.aui.scroll_element).animate({
                    scrollTop: selected_element_offset - 120
                }, scroll_transition_time);
            } else if (selected_element_offset < wrapper_scrolltop + 100) {
                // element is above, scroll down
                $(window.aui.scroll_element).animate({
                    scrollTop: selected_element_offset + selected_element_height - window.aui.meta.window_height + 120
                }, scroll_transition_time);
            }

            window.aui.last_scroll_to_element = window.aui.utils.get_time();
        },

        extend_scrollable_area: {
            /*
             * There are certain situations where we might need to extend the
             * scrollable area in aui-content
             *
             * This might be because we have an absolutely positioned element
             * that goes off screen
             *
             * These methods allow for a variable extension of the scrollable area
            */

            toggle: function(element) {

                var footer_height = $("#aui-footer").height(),
                    element_position = aui.element_position(element, false),
                    needs_extending = false;

                if (element_position) {
                    if (element_position.bottom.bottom_edge < footer_height) {
                        var diff = 40 + footer_height - aui.element_position(element, false).bottom.bottom_edge,
                            round = (parseInt(diff / 10) + 1) * 10;

                        needs_extending = true;
                    }
                }

                if (needs_extending) {
                    this.extend(round);
                } else {
                    this.compress();
                }

                return;
            },
            extend: function(height) {
                $("body").append("<style class='aui-extend-scroll-styles'>#aui-content {padding-bottom: " + (height || 100) + "px;}</style");
            },
            compress: function() {
                $(".aui-extend-scroll-styles").remove();
            }

        },

        slide: {

            /*
             * This code is intended to make creating slideshows easier and more consistent.
             *
             * It offers standard methods that are used in different types of slideshows.
             *
             * Eventually it would be nice if all slideshows in Artlogic UI could utilise these methods,
             * although they will need more work to make them more generic.
            */

            init: function() {
                window.aui.slide.preload_templates();
            },

            count: 0,

            active_slide: {},

            preload_template: function(template, callback) {
               //window.aui.preload_template(window.aui.slideshows[template].settings.template_url, callback);
            },

            preload_templates: function() {
                $.each(window.aui.slideshows, function(key, value) {
                    if (!($("#" + value.settings.template).length > 0)) {
                        window.aui.slide.preload_template(key);
                    }
                });
            },

            load_template: function(template, slideshow, slide_data, index_offset, slides_only) {

                /*
                 * Load the template as specified in the load() options.
                 *
                 * TODO: make slideshow work with precompiled handlebars templates
                */

                var data = {
                    id: slideshow,
                    slides: [],
                    number_of_slides: window.aui.slideshows[template].settings.number_of_slides || window.aui.slide.number_of_slides,
                    slide_number_editable: window.aui.slideshows[template].settings.slide_number_editable,
                    slideshow_settings: window.aui.slideshows[template].settings
                }

                if (window.aui.slides[slideshow].slides) {
                    data.slides = slide_data || window.aui.slides[slideshow].slides; //window.aui.slideshows[template].settings.slide_data;
                }
                var count_slides = 0;


                //var settings_html = $("#" + window.aui.slideshows[template].settings.template).html();
                var hb_template = window.aui.templates.aui_slide_partial; //Handlebars.compile(settings_html);

                if (slides_only) {
                    hb_template = window.aui.templates.aui_slides;
                    //settings_html = $("#" + window.aui.slideshows[template].settings.slides_template).html();
                } else {
                    Handlebars.registerPartial('slides', window.aui.templates.aui_slides); //Handlebars.registerPartial('slides', $("#" + window.aui.slideshows[template].settings.slides_template).html());
                }
                var context = data;
                var html = hb_template(context);

                if (window.aui.slideshows[template].on_template_load) {
                    window.aui.slideshows[template].on_template_load();
                }

                return html;
            },

            set_html_slides: function(element) {

                /*
                 * Create a slideshow from html attributes. Use in a similar way to fancybox.
                 *
                 * HTML attributes
                 * --------------------
                 *
                 * data-slide: This attribute is required. The value should be the name for a group of slides,
                 * e.g. data-slide="artowrks" - put this same value on all artwork elements that you want to be part of the slideshow.
                 *
                 * data-slide-id: Unique id to target the slide - this is generated automatically if ommitted. Not required.
                 *
                 * data-slide-index: Index of the slide inside the slideshow - generated automatically if ommitted (based on position in the DOM). Not required.
                 *
                 * data-image: Url of the image to be displayed in the slideshow.
                 *
                 *
                */

//                window.aui.slide.preload_templates();
//
//                var slideshow = "";
//
//                window.aui.slide.number_of_slides = $(element).length;
//
//                var slide_data =[];
//
//                $(element).each(function(slide_index, slide_obj) {
//                    var slide = $(slide_obj),
//                        id = $(slide_obj).attr("data-slide-id") || $(slide_obj).attr("data-slide-id", window.aui.utils.generate_uid()).attr("data-slide-id"),
//                        index = $(slide_obj).attr("data-slide-index") || $(slide_obj).attr("data-index") || $(slide_obj).attr("data-slide-index", slide_index + 1).attr("data-slide-index"),
//                        image = $(slide_obj).attr("data-slide-image") || $(slide_obj).find("img").first().attr("src"),
//                        caption = $(slide_obj).attr("data-slide-caption") || $(slide_obj).find("[data-slide-caption]").text() || false;
//
//                    slideshow = $(element).attr("data-slide") || $(element).attr("data-slide", window.aui.slide.count).attr("data-slide");
//
//                    slide_data.push({
//                        id: id,
//                        index: parseInt(index),
//                        image: image,
//                        content: caption
//                    });
//
//                });
//
//                window.aui.slide.add_slides(slideshow, slide_data);

            },

            add_slides: function(slideshow, slide_data, options, index_offset) {

                /*
                 * Add slides to the slides object.
                 * Creates a new slideshow object if it doesn't exist,
                 * otherwise adds slides to an existing slideshow.
                 *
                 * ARGUMENTS
                 * ===========
                 *
                 * slideshow
                 * ------------
                 * type: string
                 * description: Name of the slideshow to load. If you have added slides from your html with the set_html_slides method,
                 * this is the value of the data-slide attribute in the html, e.g. data-slide="artworks".
                 *
                 * slide_data
                 * --------------
                 * type: Array
                 * description: Data to be used by the slideshow - this will be passed to the handlebars template. The data should be an array of objects.
                 * example: [
                 *      {
                 *          image: "http://www.mrwallpaper.com/wallpapers/forest-trees-waterfall.jpg",
                 *          content: "Forest waterfall"
                 *      },
                 *      {
                 *          image: "http://3.bp.blogspot.com/-8PyW2Uh5i-o/UdGu3XRB8hI/AAAAAAAABjU/hmtcV_PCqXI/s1600/skogafoss_waterfall_iceland.jpg",
                 *          content: "Big waterfall"
                 *      }
                 * ]
                 *
                */

                var exists = true,
                    new_slide_data;

                window.aui.slide.preload_templates();

                if (!window.aui.slides[slideshow]) {
                    window.aui.slides[slideshow] = {
                        slides: [],
                        options: {}
                    };
                    window.aui.slide.count ++;
                    exists = false;
                }

                window.aui.slides[slideshow].options = options;

                window.aui.slide.number_of_slides = slide_data.length;

                new_slide_data = window.aui.slide.normalise_slide_data(slideshow, slide_data, index_offset || 0);

                if (exists) {
                    window.aui.slideshows.simple_fullscreen.settings.slide_data = slide_data;
                    $(".aui-slideshow ul").append(window.aui.slide.load_template("simple_fullscreen", slideshow, new_slide_data, index_offset || 0, true));
                }

            },

            reset_slides: function(slideshow) {
                /*
                 * Reset the slide data that is stored in
                 * aui.slides
                 *
                 *
                 */

                window.aui.slides[slideshow] = {
                    slides: [],
                    options: {}
                };
            },

            normalise_slide_data: function(slideshow, slide_data, index_offset) {
                /*
                 * Loops through existing data and checks if there
                 * any existing objects in the data.
                 *
                 * Only adds new slide data that doesn't already exist
                 *
                 *
                 */

                // dependencies
                var _get_slide_by_id = window.aui.slide.get_slide_by_id;

                var normalised_data = {},
                    new_data = [];
                    //index_offset = window.aui.slides[slideshow].slides.length;

                for (var i = 0; i < slide_data.length; i++) {
                    if (!_get_slide_by_id(slideshow, slide_data[i].id)) {
                        var id = slide_data[i].id || window.aui.utils.generate_uid(),
                            index = slide_data[i].index || i + 1;

                        slide_data[i].id = id;
                        slide_data[i].index = index_offset + index;

                        window.aui.slides[slideshow].slides.push(slide_data[i]);
                        new_data.push(slide_data[i]);
                    }
                }

                return new_data;
            },

            load: function(slideshow, options) {

                /*
                 * Method for loading a slideshow. This is the method that should be used inside your application.
                 *
                 * ARGUMENTS
                 * ===========
                 *
                 * slideshow
                 * ------------
                 * type: string
                 * description: Name of the slideshow to load. If you have added slides from your html with the add_slides method,
                 * this is the value of the data-slide attribute in the html, e.g. data-slide="artworks".
                 *
                 * slideshow_template
                 * -------------------------
                 * type: string
                 * description: Name of the slideshow you want to use - choose one of the slideshows inside the window.aui.slideshows array.
                 *
                 * slide_data
                 * -------------------
                 * type: Array
                 * description: Data to be used by the slideshow - this will be passed to the handlebars template. The data should be an array of objects.
                 * example: [
                 *      {
                 *          image: "http://www.mrwallpaper.com/wallpapers/forest-trees-waterfall.jpg",
                 *          content: "Forest waterfall"
                 *      },
                 *      {
                 *          image: "http://3.bp.blogspot.com/-8PyW2Uh5i-o/UdGu3XRB8hI/AAAAAAAABjU/hmtcV_PCqXI/s1600/skogafoss_waterfall_iceland.jpg",
                 *          content: "Big waterfall"
                 *      }
                 * ]
                 *
                */

                var settings = $.extend({
                    slideshow_template: "simple_fullscreen",
                    slide_index: false,
                    slide_id: false,
                    slide_data: false,
                    on_load: false,
                    on_slide: false,
                    on_last_slide: false
                }, options);

//                if (!settings.slide_index && settings.slide_id) {
//                    settings.slide_index = window.aui.slide.get_slide_index(slideshow, settings.slide_id);
//                }

                if (settings.slide_data) {
                    window.aui.slide.number_of_slides = settings.slide_data.length;
                } else {
                    window.aui.slide.number_of_slides = $("[data-slide='" + slideshow + "']").length;
                }


                if (window.aui.slideshows[settings.slideshow_template]) {

                    $.extend(window.aui.slideshows[settings.slideshow_template].settings, settings);

                    if (window.aui.slideshows[settings.slideshow_template].settings.key_controls) {
                        window.aui.slide.key_controls(slideshow);
                    }

                    if (window.aui.slideshows[settings.slideshow_template].settings.slide_number_editable) {
                        window.aui.slide.slide_index_input(slideshow, settings.slideshow_template, window.aui.slideshows[settings.slideshow_template].settings.transition_speed);
                    }

                    if (window.aui.slideshows[settings.slideshow_template].event_handlers) {
                        window.aui.slideshows[settings.slideshow_template].event_handlers(slideshow);
                    }

                    if (window.aui.slideshows[settings.slideshow_template].load) {

                        if (settings.slide_index) {
                            window.aui.slideshows[settings.slideshow_template].load(slideshow, window.aui.slide.get_slide_by_index(slideshow, settings.slide_index), settings);
                        } else if (settings.slide_id) {
                            window.aui.slideshows[settings.slideshow_template].load(slideshow, settings.slide_id, settings);
                        }
                    }

                    if (window.aui.slideshows[settings.slideshow_template].resize && !window.aui.slideshows[settings.slideshow_template].resize_function_set) {
                        $(window).resize(function() {
                            window.aui.slideshows[settings.slideshow_template].resize(slideshow);
                            window.aui.slideshows[settings.slideshow_template].resize_function_set = true;
                        });
                    }
                }
            },

            normalise_slide: function(slideshow, slide, slideshow_template, transition_speed) {

                /*
                 * This method is called from the load_slide function.
                 *
                 * Accepts different values for slide and converts them to a slide id,
                 * which is needed for the load_slide method.
                 *
                 *
                 * TODO: This is a mess, needs refactoring (reuse code etc.).
                 *
                */


                // dependencies
                var _load_slide = window.aui.slide.load_slide,
                    _get_slide_by_id = window.aui.slide.get_slide_by_id,
                    _get_slide_by_index = window.aui.slide.get_slide_by_index,
                    _get_slide_index = window.aui.slide.get_slide_index;



                if (slide === "next") {

                    var new_slide_index = window.aui.slide.active_slide[slideshow].index + 1;
                    var slide_object = _get_slide_by_index(slideshow, new_slide_index);

                    //if (new_slide_index > window.aui.slides[slideshow].slides.length) {
                    if (!slide_object) {
                        var callback = function() {
                            slide = _get_slide_by_index(slideshow, new_slide_index);
                            _load_slide(slideshow, slide, slideshow_template, transition_speed);
                        }

                        $("[data-slideshow='" + slideshow + "']").trigger("aui_before_slide", [slideshow, false, new_slide_index, callback]);

                        $("[data-slideshow='" + slideshow + "']").trigger("aui_slide", [slideshow, false, new_slide_index, callback]);

                        return false;
                    } else {
                        slide = slide_object;
                    }

                } else if (slide === "previous" || slide === "prev") {
                    var new_slide_index = window.aui.slide.active_slide[slideshow].index - 1;
                    var slide_id = _get_slide_by_index(slideshow, new_slide_index);

                    if (!slide_id) {
                        var callback = function() {
                            slide = _get_slide_by_index(slideshow, new_slide_index);
                            _load_slide(slideshow, slide, slideshow_template, transition_speed);
                        }

                        $("[data-slideshow='" + slideshow + "']").trigger("aui_before_slide", [slideshow, false, new_slide_index, callback]);

                        $("[data-slideshow='" + slideshow + "']").trigger("aui_slide", [slideshow, false, new_slide_index, callback]);

                        return false;
                    } else {
                        slide = slide_id;
                    }
                } else if (slide === "skip-next") {
                    var new_slide_index = window.aui.slide.active_slide[slideshow].index + window.aui.slideshows[slideshow_template].settings.skip_distance;

                    if (new_slide_index > window.aui.slides[slideshow].slides.length) {

                        var callback = function() {
                            slide = _get_slide_by_index(slideshow, new_slide_index);
                            _load_slide(slideshow, slide, slideshow_template, transition_speed);
                        }

                        $("[data-slideshow='" + slideshow + "']").trigger("aui_before_slide", [slideshow, false, new_slide_index, callback]);
                        $("[data-slideshow='" + slideshow + "']").trigger("aui_slide", [slideshow, false, new_slide_index, callback]);

                        return false;
                    } else {
                        slide = _get_slide_by_index(slideshow, new_slide_index);
                    }
                } else if (slide === "skip-prev") {
                    var new_slide_index = window.aui.slide.active_slide[slideshow].index - window.aui.slideshows[slideshow_template].settings.skip_distance;

                    if (new_slide_index > window.aui.slides[slideshow].slides.length) {

                        var callback = function() {
                            slide = _get_slide_by_index(slideshow, new_slide_index);
                            _load_slide(slideshow, slide, slideshow_template, transition_speed);
                        };

                        $("[data-slideshow='" + slideshow + "']").trigger("aui_before_slide", [slideshow, false, new_slide_index, callback]);

                        return false;
                    } else {
                        slide = window.aui.slide.get_slide_by_index(slideshow, new_slide_index);
                    }
                } else if (_get_slide_by_id(slideshow, slide)) {
                    // slide is already an id
                    slide = slide;
                } else {

                    if (slide > window.aui.slides[slideshow].slides.length) {
                        // slide is probably an index
                        var callback = function() {
                            slide = _get_slide_by_index(slideshow, slide);
                            _load_slide(slideshow, slide, slideshow_template, transition_speed);
                        }

                        console.log('slide not loaded, trigger before_slide event');
                        $("[data-slideshow='" + slideshow + "']").trigger("aui_before_slide", [slideshow, false, slide, callback]);

                        return false;
                    } else {
                        // slide might be a number (index) - pass it to the get_slide_by_index function (if it's not a number it will return false)
                        slide = _get_slide_by_index(slideshow, slide);
                    }

                }

                return slide;
            },

            load_slide: function(slideshow, slide_id, slideshow_template, transition_speed) {

                /*
                 * Load a specific slide.
                 *
                 *
                */

                var _get_slide_index = window.aui.slide.get_slide_index;

                if (slide_id) {
                    slide_id = window.aui.slide.normalise_slide(slideshow, slide_id, slideshow_template, transition_speed);
                    var slide_index = _get_slide_index(slideshow, slide_id);
                    //$("[data-slideshow='" + slideshow + "']").trigger("aui_before_slide", [slideshow, slide_id, slide_index]);
                }
                if (!slide_id) {
                    //$("[data-slideshow='" + slideshow + "']").trigger("aui_no_slide", [slideshow, slide_id]);
                    console.log("The slide you're trying to load doesn't exist.");
                } else {

                    if (window.aui.slide.update(slideshow, slide_id, slideshow_template)) {

                        if (!$(".aui-slideshow [data-slide-id='" + slide_id + "']").find("img").attr("src")) {
                            $(".aui-slideshow [data-slide-id='" + slide_id + "']").find("img").attr("src", $(".aui-slideshow [data-slide-id='" + slide_id + "']").find("img").data("src"));
                        }

                        if (window.aui.utils.is_function(window.aui.slideshows[slideshow_template].settings.custom_transition)) {
                            window.aui.slideshows[slideshow_template].settings.custom_transition(slideshow, slide_id);
                        } else {
                            window.aui.slide.transitions.fade(slide_id, transition_speed);
                        }

                        if (window.aui.slideshows[slideshow_template].slide) {
                            window.aui.slideshows[slideshow_template].slide(slideshow, slide_id);
                        }

                        if (window.aui.slide.on_slide) {
                            window.aui.slide.on_slide(slideshow, slide_id, slide_index);
                        }

                        $("[data-slideshow='" + slideshow + "']").trigger("aui_slide", [slideshow, slide_id, slide_index]);

                    } else {
                        // slide is already loaded
                    }
                }

            },

            slide_index_input: function(slideshow, slideshow_template, transition_speed) {

                /*
                 * Event handler for a number input.
                 *
                 * If you want to add a number input for users to navigate directly to a slide number,
                 * add a contenteditable element with the class ".aui-slide-number-field".
                 *
                 * This function will handle the rest - on hitting the enter key, if there is a slide with an
                 * index that matches the number, that slide is loaded.
                */

                $(document).on("keydown", function(event) {
                    if ($(document.activeElement).hasClass("aui-slide-number-field")) {
                        if (event.keyCode === 13) {
                            event.preventDefault();
                            if (!isNaN($(document.activeElement).text())) {

                                var index_input = parseInt($(document.activeElement).text());
                                var slide_id = window.aui.slide.get_slide_by_index(slideshow, index_input);

                                window.aui.slide.load_slide(slideshow, slide_id || index_input, slideshow_template, transition_speed);
                                $(".aui-slide-number-field").blur();
                            }
                        }
                    }
                });

            },

            transitions: {
                fade: function(slide, transition_speed) {

                    // TODO: Make sure this "just works" - ideally there should be no required styles etc.

                    if (transition_speed) {
                        $(".aui-slideshow .aui-active").removeClass("aui-active").fadeOut(transition_speed);
                        $(".aui-slideshow [data-slide-id='" + slide + "']").addClass("aui-active").fadeIn(transition_speed);
                    } else {
                        $(".aui-slideshow .aui-active").removeClass("aui-active").css("display", "none");
                        $(".aui-slideshow [data-slide-id='" + slide + "']").addClass("aui-active").css("display", "block");
                    }

                },
                slide: function(slide, transition_speed) {
                    // TO DO: Make a generic slide transtion
                }
            },

            update: function(slideshow, slide_id, slideshow_template, callback) {

                if (!window.aui.slide.active_slide[slideshow]) {
                    window.aui.slide.active_slide[slideshow] = {};
                }

                if (window.aui.slide.active_slide[slideshow].id !== slide_id) {
                    var slide_object = window.aui.slide.get_slide_by_id(slideshow, slide_id);
                    if (slide_object) {
                        window.aui.slide.active_slide[slideshow].id = slide_id;
                        window.aui.slide.active_slide[slideshow].index = slide_object.index; // window.aui.slide.get_slide_index(slideshow, slide_id);
                        window.aui.slide.active_slide[slideshow].slideshow_template = slideshow_template;
                        if (window.aui.slide.get_slide_index(slideshow, slide_id) === window.aui.slide.number_of_slides) {
                            window.aui.slide.active_slide[slideshow].last_slide = true;
                        } else {
                            window.aui.slide.active_slide[slideshow].last_slide = false;
                        }
                    } else if (window.aui.slide.get_slide_by_index(slideshow, slide_id)) {
                        window.aui.slide.active_slide[slideshow].index = slide_id;
                        window.aui.slide.active_slide[slideshow].id = window.aui.slide.get_slide_by_index(slideshow, slide_id);
                        window.aui.slide.active_slide[slideshow].slideshow_template = slideshow_template;
                        if (slide_id === window.aui.slide.number_of_slides) {
                            window.aui.slide.active_slide[slideshow].last_slide = true;
                        } else {
                            window.aui.slide.active_slide[slideshow].last_slide = false;
                        }
                    } else {
                        console.log("The slide you're trying to update doesn't exist.");
                    }

                    window.aui.slide.update_listeners(slideshow);

                    if (callback) {
                        callback();
                    }

                    return true;

                } else {
                    return false;
                }

            },

            update_listeners: function(slideshow) {

                $("[data-slide-listener='" + slideshow + "']").each(function() {
                    $(this).html(window.aui.slide.active_slide[slideshow].index);
                });

            },

            get_slide_by_id: function(slideshow, id) {
                /*
                 * Method to return the slide data of a slide with the specified id,
                 * inside the specified slideshow.
                */

                // dependencies
                var _slides = window.aui.slides[slideshow].slides;

                var slide = false;

                for (var i = 0; _slides.length > i; i++) {
                    if (_slides[i].id === id) {
                        slide = _slides[i];
                    }
                }

                return slide;


            },

            get_slide_by_index: function(slideshow, index) {

                /*
                 * Method to return the id of a slide with the specified index,
                 * inside the specified slideshow.
                */

                // dependencies
                var _slides = window.aui.slides[slideshow].slides;

                var slide_id;

                for (var i = 0; _slides.length > i; i++) {
                    if (_slides[i].index === index) {
                        slide_id = _slides[i].id;
                    }
                }

                return slide_id;

            },

            get_slide_index: function(slideshow, id) {
                /*
                 * Method to return the slide data of a slide with the specified id,
                 * inside the specified slideshow.
                */

                // dependencies
                var _slides = window.aui.slides[slideshow].slides;

                var slide_index;

                for (var i = 0; _slides.length > i; i++) {
                    if (_slides[i].id === id) {
                        slide_index = i + 1;
                    }
                }

                return slide_index;
            },

            key_controls: function(slideshow) {

                /*
                 * Event handlers for slideshow key controls
                 * (left/right arrow keys to navigate, esc key to close where appropriate)
                 *
                */

                if (!window.aui.slide.key_controls_set) {

                    $(document).on("keydown", function(event) {
                        if (window.aui.slide.state() && !$(document.activeElement).hasClass("aui-slide-number-field")) {
                            if(event.keyCode === 39) {
                                window.aui.slide.load_slide(slideshow, "next", window.aui.slide.active_slide[slideshow].slideshow_template, window.aui.slideshows[window.aui.slide.active_slide[slideshow].slideshow_template].settings.transition_speed);
                            } else if(event.keyCode === 37) {
                                window.aui.slide.load_slide(slideshow, "prev", window.aui.slide.active_slide[slideshow].slideshow_template, window.aui.slideshows[window.aui.slide.active_slide[slideshow].slideshow_template].settings.transition_speed);
                            } else if(event.keyCode === 27) {
                                //window.aui.slide.close();
                            }
                        }
                    });

                    window.aui.slide.key_controls_set = true;
                }
            },

            close: function() {

                /*
                 * Close slideshow
                 * (this method only makes sense for slideshows that overlay other content)
                */

                $(".aui-slideshow").remove();
                window.aui.slide.last_active_slide = window.aui.slide.active_slide;
                window.aui.slide.active_slide = {};
            },

            state: function() {

                /*
                 * Check if slideshow is on the page
                 * (this method only makes sense for slideshows that overlay other content)
                */

                if ($(".aui-slideshow").length && !($(".aui-slideshow").closest(".aui-overlay-box").length && !window.aui.overlay_box.state())) {
                    return true;
                } else {
                    return false;
                }
            }

        },

        slides: {},

        slideshows: {
            simple_fullscreen: {
                event_handlers: function(slideshow) {
                    var that = this;
                    if (!window.aui.slideshows.simple_fullscreen.events_initialised) {
                        $("body").on("click", ".aui-slide-close", function(event) {
                            event.preventDefault();
                            window.aui.slideshows.simple_fullscreen.close();
                        });

                        $("body").on("click", ".aui-slide-next", function() {
                            window.aui.slide.load_slide(slideshow, "next", "simple_fullscreen", window.aui.slideshows.simple_fullscreen.settings.transition_speed);
                        });

                        $("body").on("click", ".aui-slide-previous", function() {
                            window.aui.slide.load_slide(slideshow, "previous", "simple_fullscreen", window.aui.slideshows.simple_fullscreen.settings.transition_speed);
                        });

                        $("body").on("click", ".aui-slide-skip-next", function() {
                            window.aui.slide.load_slide(slideshow, "skip-next", "simple_fullscreen", window.aui.slideshows.simple_fullscreen.settings.transition_speed);
                        });

                        $("body").on("click", ".aui-slide-skip-previous", function() {
                            window.aui.slide.load_slide(slideshow, "skip-prev", "simple_fullscreen", window.aui.slideshows.simple_fullscreen.settings.transition_speed);
                        });

                        $(window).on("swipeleft", function() {
                            if (window.aui.slide.state) {
                                window.aui.slide.load_slide(slideshow, "next", "simple_fullscreen", window.aui.slideshows.simple_fullscreen.settings.transition_speed);
                            }
                        });

                        $(window).on("swiperight", function() {
                            if (window.aui.slide.state) {
                                window.aui.slide.load_slide(slideshow, "previous", "simple_fullscreen", window.aui.slideshows.simple_fullscreen.settings.transition_speed);
                            }
                        });

                        var clicked_off = false;


                        var debounced_function= window.aui.utils.debounce(function() {
                            that.show_controls(slideshow);
                        }, 4000);

                        $("body").on("mousemove", function() {
                            if (!clicked_off) {
                                that.hide_controls(slideshow);
                            }
                            debounced_function();
                        });

                        $("body").on("click", "[data-slideshow='" + slideshow + "'] li", function() {
                            //if (elements_to_hide.css("display") === "none") {
                            var slideshow_el = $("[data-slideshow='" + slideshow + "']");
                            if (slideshow_el.hasClass("aui-hide-slideshow-controls")) {
                                clicked_off = false;
                            } else {
                                clicked_off = true;
                            }
                            //elements_to_hide.fadeToggle();
                            slideshow_el.toggleClass("aui-hide-slideshow-controls");

                        });

                        window.aui.slideshows.simple_fullscreen.events_initialised = true;
                    }
                },
                show_controls: function(slideshow) {
                    var slideshow_el = $("[data-slideshow='" + slideshow + "']");
                    slideshow_el.addClass("aui-hide-slideshow-controls");
                },
                hide_controls: function(slideshow) {
                    var slideshow_el = $("[data-slideshow='" + slideshow + "']");
                    slideshow_el.removeClass("aui-hide-slideshow-controls");
                },
                toggle_controls: function(slideshow) {
                    var slideshow_el = $("[data-slideshow='" + slideshow + "']");
                    slideshow_el.toggleClass("aui-hide-slideshow-controls");
                },
                load: function(slideshow, slide, options) {

                    var settings = $.extend({
                        animation: "slide-up",
                        animation_speed_in: 300,
                        animation_speed_out: 300
                    }, options);

                    var slide_settings = window.aui.slides[slideshow].options;

                    window.aui.overlay_box.load({
                        content: "<div class='aui-slideshow aui-slide-simple aui-theme-" + window.aui.slideshows.simple_fullscreen.settings.theme + " aui-slideshow-caption-"+slide_settings.caption_style+"' data-slideshow='" + slideshow + "'>" + window.aui.slide.load_template("simple_fullscreen", slideshow) + "</div>",
                        fullscreen: true,
                        id: "aui-slideshow-overlaybox",
                        buttons: false,
                        no_padding: true,
                        blur_background: false,
                        animation: settings.animation,
                        animation_speed_in: settings.animation_speed_in,
                        animation_speed_out: settings.animation_speed_out,
                        scroll_height: false,
                        callback: function() {
//                            $("[data-slide-id]").find(".aui-caption").css("opacity", 0);
                            window.aui.slide.load_slide(slideshow, slide, "simple_fullscreen", window.aui.slideshows.simple_fullscreen.settings.transition_speed);
                        }
                    });


                },
                close: function() {
                    window.aui.overlay_box.close(function() {
                        window.aui.slide.close();
                    }, $("#aui-slideshow-overlaybox"));
                },
                slide: function(slideshow, slide, options) {
                    window.aui.slideshows.simple_fullscreen.set_image_size(false, slide);
                    window.scrollTo(0,0);
//                    var slideshow_el = $("[data-slideshow='" + slideshow + "']");
//                            slideshow_el.addClass("aui-hide-slideshow-controls");

//                    $("[data-slide-id='" + slide + "']").find("img").on("load", function() {
//                        var offset_left = $("[data-slide-id='" + slide + "']").find("img").offset().left;
//
//                        $("[data-slide-id='" + slide + "']").find(".aui-caption").css({
//                            "left": offset_left,
//                            "opacity": ""
//                        })
//                    });
                },
                resize: function(slideshow) {
                    if (window.aui.slide.state()) {

                        // fix bug on ipad ios7 landscape mode (window height incorrect, page scrolls)
                        if(navigator.userAgent.match(/iPad;.*CPU.*OS 7_\d/i)) {
                            if(window.orientation == 90 || window.orientation == -90) {
                                window.aui.slideshows.simple_fullscreen.settings.padding = 25;
                            } else {
                                window.aui.slideshows.simple_fullscreen.settings.padding = 35;
                            }
                        }

                        window.aui.slideshows.simple_fullscreen.set_image_size(slideshow, window.aui.slide.active_slide[slideshow].id);
                        window.scrollTo(0,0);

                    }
                },
                on_template_load: function() {
                    // TODO: Add this class to the wrapper, and change the css accordingly
                    $(".aui-slideshow .aui-caption").addClass("aui-text-align-" + window.aui.slideshows.simple_fullscreen.settings.text_align);
                },
                set_image_size: function(slideshow, slide_id) {

                    // set the size of the image to the window width/height minus the caption height and the specified padding

                    var caption_height = 0; //$(".aui-slideshow [data-slide-id='" + slide_id + "'] .aui-caption").height() + 30 || 56;

                    $(".aui-slideshow [data-slide-id='" + slide_id + "']").find(".simple-slide-image-container").css({
                        height: ($(window).height() - caption_height - window.aui.slideshows.simple_fullscreen.settings.padding * 2),
                        width: $(window).width() - window.aui.slideshows.simple_fullscreen.settings.padding * 2
                    });
                },
                settings: {
                    template: "aui-slide-template-simple",
                    slides_template: "aui-slides-template-simple",
                    //template_url: "/lib/core/ui/v02/templates/slideshow/simple.html",
                    key_controls: true,
                    transition_speed: 800,
                    text_align: "left",
                    padding: 25,
                    theme: "inherit",
                    slide_number_editable: true,
                    show_skip_buttons: false,
                    skip_distance: 50
                }
            },
            simple_box: {
                event_handlers: function(slideshow) {
                    if (!window.aui.slideshows.simple_box.events_initialised) {
                        $("body").on("click", ".aui-slide-close", function(event) {
                            event.preventDefault();
                            window.aui.slideshows.simple_box.close();
                        });

                        $("body").on("click", ".aui-slide-next", function() {
                            window.aui.slide.load_slide(slideshow, "next", "simple_box", window.aui.slideshows.simple_box.settings.transition_speed);
                        });

                        $("body").on("click", ".aui-slide-previous", function() {
                            window.aui.slide.load_slide(slideshow, "previous", "simple_box", window.aui.slideshows.simple_box.settings.transition_speed);
                        });

                        $("body").on("click", ".aui-slide-skip-next", function() {
                            window.aui.slide.load_slide(slideshow, "skip-next", "simple_box", window.aui.slideshows.simple_box.settings.transition_speed);
                        });

                        $("body").on("click", ".aui-slide-skip-previous", function() {
                            window.aui.slide.load_slide(slideshow, "skip-prev", "simple_box", window.aui.slideshows.simple_box.settings.transition_speed);
                        });

                        $(window).on("swipeleft", function() {
                            if (window.aui.slide.state) {
                                window.aui.slide.load_slide(slideshow, "next", "simple_box", window.aui.slideshows.simple_box.settings.transition_speed);
                            }
                        });

                        $(window).on("swiperight", function() {
                            if (window.aui.slide.state) {
                                window.aui.slide.load_slide(slideshow, "previous", "simple_box", window.aui.slideshows.simple_box.settings.transition_speed);
                            }
                        });

                        var clicked_off = false;
                        var slideshow_el = $("[data-slideshow='" + slideshow + "']");

                        var debounced_function= window.aui.utils.debounce(function() {
                            var elements_to_hide = $("[data-slideshow='" + slideshow + "']").find(".aui-caption, .aui-slide-close, .simple-slide-count");
                            //elements_to_hide.fadeOut();
                            slideshow_el.addClass("aui-hide-slideshow-controls");
                        }, 4000);

                        $("body").on("mousemove", function() {
                            if (!clicked_off) {
                                var elements_to_hide = $("[data-slideshow='" + slideshow + "']").find(".aui-caption, .aui-slide-close, .simple-slide-count");
                                //elements_to_hide.fadeIn();
                                slideshow_el.removeClass("aui-hide-slideshow-controls");
                            }
                            debounced_function();
                        });

                        $("body").on("click", "[data-slideshow='" + slideshow + "'] li", function() {
                            var elements_to_hide = $("[data-slideshow='" + slideshow + "']").find(".aui-caption, .aui-slide-close, .simple-slide-count");
                            //if (elements_to_hide.css("display") === "none") {
                            if (slideshow_el.hasClass("aui-hide-slideshow-controls")) {
                                clicked_off = false;
                            } else {
                                clicked_off = true;
                            }
                            //elements_to_hide.fadeToggle();
                            slideshow_el.toggleClass("aui-hide-slideshow-controls");

                        });

                        window.aui.slideshows.simple_box.events_initialised = true;
                    }
                },
                load: function(slideshow, slide, options) {

                    var settings = $.extend({
                        animation: "fade",
                        animation_speed_in: 300,
                        animation_speed_out: 300
                    }, options);

                    window.aui.overlay_box.load({
                        content: "<div class='aui-slideshow aui-slide-simple aui-theme-" + window.aui.slideshows.simple_box.settings.theme + "' data-slideshow='" + slideshow + "'>" + window.aui.slide.load_template("simple_box", slideshow) + "</div>",
                        id: "aui-slideshow-overlaybox",
                        buttons: false,
                        no_padding: true,
                        css_class: 'aui-slideshow-simple-box',
                        blur_background: false,
                        scroll_height: false,
                        animation: settings.animation,
                        animation_speed_in: settings.animation_speed_in,
                        animation_speed_out: settings.animation_speed_out,
                        callback: function() {
                            window.aui.slide.load_slide(slideshow, slide, "simple_box", window.aui.slideshows.simple_box.settings.transition_speed);
                            $(".aui-slideshow .aui-active").removeClass("aui-active").css("display", "none");
                            $(".aui-slideshow [data-slide-id='" + slide + "']").addClass("aui-active").css("display", "block");
                        },
                        callback_before_animation: function() {
                            //window.aui.slideshows.simple_box.set_image_size(slideshow, window.aui.slide.active_slide[slideshow].id);
                        }
                    });


                },
                close: function() {
                    window.aui.overlay_box.close(function() {
                        window.aui.slide.close();
                    }, $("#aui-slideshow-overlaybox"));
                },
                slide: function(slideshow, slide, options) {
                    window.aui.slideshows.simple_box.set_image_size(slideshow, slide);
                },
                resize: function(slideshow) {
                    if (window.aui.slide.state()) {

                        // fix bug on ipad ios7 landscape mode (window height incorrect, page scrolls)
                        if(navigator.userAgent.match(/iPad;.*CPU.*OS 7_\d/i)) {
                            if(window.orientation == 90 || window.orientation == -90) {
                                window.aui.slideshows.simple_box.settings.padding = 25;
                            } else {
                                window.aui.slideshows.simple_box.settings.padding = 35;
                            }
                        }

                        window.aui.slideshows.simple_box.set_image_size(slideshow, window.aui.slide.active_slide[slideshow].id);
                        window.scrollTo(0,0);

                    }
                },
                on_template_load: function() {
                    // TODO: Add this class to the wrapper, and change the css accordingly
                    $(".aui-slideshow .aui-caption").addClass("aui-text-align-" + window.aui.slideshows.simple_box.settings.text_align);
                },
                set_image_size: function(slideshow, slide_id) {

                    // set the size of the image to the window width/height minus the caption height and the specified padding

                    var caption_height = $(".aui-slideshow [data-slide-id='" + slide_id + "'] .aui-caption").innerHeight() + 30 || 56;

                    var slide_data = window.aui.slide.get_slide_by_id(slideshow, slide_id);
                    var image_dimensions = {},
                        image_taller = false,
                        image_wider = false,
                        ol_box_max_height_string,
                        ol_box_max_height,
                        ol_box_max_width_string,
                        ol_box_max_width,
                        image_max_height,
                        image_max_width;

                    if (slide_data) {
                        image_dimensions = slide_data.image_dimensions;
                    }

                    // this assumes overlay_box has a max-height/max-width percentage value (it always did at the time of writing)
                    ol_box_max_height_string = $(".aui-overlay-box-content-wrapper").css("max-height");
                    if (ol_box_max_height_string) {
                        ol_box_max_height = parseInt(ol_box_max_height_string.replace("%", ""));
                    }
                    image_max_height = Math.floor(window.aui.meta.window_height * (ol_box_max_height  - 2) / 100) - 1;

                    ol_box_max_width_string = $(".aui-overlay-box-content-wrapper").css("max-width");
                    if (ol_box_max_width_string) {
                        ol_box_max_width = parseInt(ol_box_max_height_string.replace("%", ""));
                    }
                    image_max_width = Math.floor(window.aui.meta.window_width * (ol_box_max_width - 2) / 100);


                    image_taller = image_dimensions.height > image_max_height;
                    image_wider = image_dimensions.width > image_max_width;

                    var ratio = Math.min(image_max_width / image_dimensions.width, image_max_height / image_dimensions.height);

                    var slide_image_container = $(".aui-slideshow [data-slide-id='" + slide_id + "']").find(".simple-slide-image-container");

                    if (image_taller || image_wider) {
                        slide_image_container.css({
                            "height": ratio * image_dimensions.height,
                            "width": ratio * image_dimensions.width
                        });
                    }

                },
                transition: function(slideshow, slide, options) {

                    var transition_speed;
                    //$(".aui-overlay-box-content-wrapper").css("display", "none");
                    if (transition_speed) {
                        $(".aui-slideshow .aui-active").removeClass("aui-active").fadeOut(transition_speed);
                        $(".aui-slideshow [data-slide-id='" + slide + "']").addClass("aui-active").fadeIn(transition_speed);
                    } else {
                        $(".aui-slideshow .aui-active").removeClass("aui-active").css("display", "none");
                        $(".aui-slideshow [data-slide-id='" + slide + "']").addClass("aui-active").css("display", "block");
                        //$(".aui-overlay-box-content-wrapper").fadeIn(transition_speed);
                    }

                },
                settings: {
                    template: "aui-slide-template-simple",
                    slides_template: "aui-slides-template-simple",
                    //template_url: "/lib/core/ui/v02/templates/slideshow/simple.html",
                    key_controls: true,
                    transition_speed: 800,
                    text_align: "left",
                    padding: 25,
                    custom_transition: function(slideshow, slide) {
                        window.aui.slideshows.simple_box.transition(slideshow, slide);
                    },
                    theme: "inherit",
                    slide_number_editable: true,
                    show_skip_buttons: false,
                    skip_distance: 50
                }
            }
        },


        /* AUI WIZARD
         * ====================================================================
         * Hector
         * The wizard is a ui tool that is useful for 'step-by-step' processes.
         * It makes heavy use of the overlay_box, and usage is very similar.
         * It should be able to handle many of the options that the overlay_box
         * can.
         *
         * check _dev_/examples/aui-components for an interactive example.
         *
         * window.example_wizard = window.aui.wizard.load({
         *      title: 'Wizard',
         *      box_width: '400px',
         *      on_load: function () {
         *          console.log('on first load!');
         *      },
         *      on_close: function () {
         *          console.log('on close');
         *      },
         *      content: [
         *          {
         *              title: 'Page 1',
         *              content: 'This is an example page, read on for some fun bonus info',
         *              on_load: function () {
         *                  console.log('on load page 1');
         *              },
         *          },
         *          {
         *              title: 'Page 2',
         *              content: 'This is another example page',
         *          },
         *      ]
         * })
         */

        wizard: {

            defaults: {
                id: 'aui_wizard',
                initial_page: 0,
                dots: true,
                nav_buttons: true,
                transition_speed: 0,
            },

            load: function (options) {
                var that = this;
                var on_first_load = options.on_load;
                delete options.on_load;
                this.options = $.extend({}, this.defaults, options);
                this.options.on_close = function () {
                    /* Stop automatically navigating */
                    clearInterval(that.nav_timer);
                    if (options.on_close) {
                        options.on_close();
                    }
                }
                this.load_page(this.options.initial_page);
                if (on_first_load) {
                    on_first_load();
                }
                if (this.options.auto_nav === true) {
                    that.auto_nav();
                }
                return this;
            },

            auto_nav: function () {
                var that = this;
                var nav_speed = this.options.nav_speed;
                this.nav_timer = setInterval(nav_loop, parseInt(nav_speed));
                var page_number = this.options.initial_page;
                function nav_loop() {
                    page_number += 1;
                    if (page_number >= that.options.content.length) {
                        page_number = 0;
                    }
                    that.load_page(page_number);
                }
            },

            load_page: function (page_number) {
                if (page_number < 0 || page_number >= this.options.content.length) {
                    return;
                }
                var page_options = $.extend({}, this.options, this.options.content[page_number]);
                page_options.buttons = this.get_buttons(page_number);
                this.next = function () {
                    return this.load_page(page_number + 1);
                }
                this.previous = function () {
                    return this.load_page(page_number - 1);
                }   
                
                /* put this in a zero-length setTimeout as event clicks get
                ignored for some reason otherwise */
                window.setTimeout(function () {
                    window.aui.overlay_box.load(page_options);
                }, 0)
            },

            get_buttons: function (page_number) {
                var that = this;
                var total_pages = this.options.content.length;
                var back_class = 'aui-button-simple browse-preview-prev';
                var next_class = 'aui-button-extra-round aui-button-highlighted browse-preview-next';

                if (page_number === 0) {
                    back_class = 'aui-button-simple browse-preview-prev hidden';
                }
                if (page_number === total_pages - 1) {
                    next_class = 'aui-button-extra-round aui-button-highlighted';
                }
                var nav_buttons = [];

                if (this.options.nav_buttons) {
                    nav_buttons.push({
                        label: 'Back',
                        halign: 'left',
                        css_class: back_class,
                        callback: function () {
                            that.load_page(page_number - 1);
                            /* Stop automatically navigating */
                            clearInterval(that.nav_timer);
                        }
                    });
                }

                if (this.options.dots) {
                    this.options.content.forEach(function (page, index) {
                        var dot_class = 'dot';
                        if (index == page_number) {
                            dot_class = 'dot active';
                        }
                        nav_buttons.push({
                            label: '<i class="fa fa-circle" aria-hidden="true"></i>',
                            halign: 'center',
                            css_class: dot_class,
                            callback: function () {
                                that.load_page(index);
                                /* Stop automatically navigating */
                                clearInterval(that.nav_timer);
                            }
                        });
                    });
                }

                if (this.options.nav_buttons) {
                    if (page_number == total_pages - 1) {
                        nav_buttons.push({
                            label: this.options.label_to_end ? this.options.label_to_end : 'Finish',
                            halign: 'right',
                            css_class: next_class,
                            callback: function () {
                                if (that.options.id) {
                                    window.aui.overlay_box.close(null, $('#' + that.options.id));
                                } else {
                                    window.aui.overlay_box.close();
                                }
                                /* Stop automatically navigating */
                                clearInterval(that.nav_timer);

                                if (that.options.on_finish) {
                                    that.options.on_finish();
                                }
                            }
                        });
                    } else {
                        nav_buttons.push({
                            label: 'Next',
                            halign: 'right',
                            css_class: next_class,
                            callback: function () {
                                that.load_page(page_number + 1);
                                /* Stop automatically navigating */
                                clearInterval(that.nav_timer);
                            }
                        });
                    }

                }

                return nav_buttons;
            },

        },

        swipe: function() {

            /* Custom events for swiping on a touch screen.
             *
             * No need to call this function, just use the event:
             *
             * $(my_element).on("swipeleft", function() { // do something });
            */

            var firstTouch = 0;
            var lastTouch = 0;
            var transitionStarted = false;

            var element_swiped;

            var touchStart = window.navigator.pointerEnabled ? "pointerdown" : window.navigator.msPointerEnabled ? "MSPointerDown" : "touchstart",
                touchMove = window.navigator.pointerEnabled ? "pointermove" : window.navigator.msPointerEnabled ? "MSPointerMove" : "touchmove",
                touchEnd = window.navigator.pointerEnabled ? "pointerup" : window.navigator.msPointerEnabled ?  "MSPointerUp" : "touchend";

            $("body").on(touchStart, function(event) {

                if (event.originalEvent.touches) {
                    //alert(event.target.outerHTML)
                    element_swiped = event.target; //event.currentTarget;
                    transitionStarted = false;
                    var touch = event.originalEvent.touches[0];

                    firstTouch = {
                        x: touch.pageX,
                        y: touch.pageY
                    }
                }

            });

            $(window).on(touchMove, function(event) {

                if (event.originalEvent.touches) {
                    var touch = event.originalEvent.touches[0];

                    lastTouch = {
                        x: touch.pageX,
                        y: touch.pageY
                    }
                }

            });

            $("body").on(touchEnd, function(event) {
                if(firstTouch) {
                    var more_horizontal = Math.abs(lastTouch.x - firstTouch.x) > Math.abs(lastTouch.y - firstTouch.y) + 50;
                    var too_vertical = Math.abs(lastTouch.y - firstTouch.y) > 100;

                    if(lastTouch.x < firstTouch.x - 30) {
                        if (more_horizontal && !too_vertical) {
                            $(element_swiped).trigger("swipeleft");
                        }
                    }

                    if(lastTouch.x > firstTouch.x + 30) {
                        if (more_horizontal && !too_vertical) {
                            $(element_swiped).trigger("swiperight");
                        }
                    }

                    if (lastTouch.y < firstTouch.y - 30) {
                        if (!more_horizontal) {
                            $(element_swiped).trigger("swipeup");
                        }
                    }

                    if (lastTouch.y > firstTouch.y + 30) {
                        if (!more_horizontal) {
                            $(element_swiped).trigger("swipedown");
                        }
                    }

                    firstTouch = false;
                    lastTouch = false;
                }
            });
        },

        undo_manager: {
            add: function(undo_methods) {
                var history_obj = undo_methods;

                history_obj.time = window.aui.utils.get_time();

                var i = window.aui.undo_manager.history.length;

                while (i--) {
                    var history_item = window.aui.undo_manager.history[i];
                    if (history_item.state === "undone") {
                        window.aui.undo_manager.history.splice(i, 1);
                    }
                }

                // handle batch process
                if (history_obj.batch_process) {
                    if (!window.aui.undo_manager.latest_batch_id) {
                        window.aui.undo_manager.latest_batch_id = window.aui.utils.generate_uid();
                    }
                    if (window.aui.undo_manager.last_item_time) {
                        if (history_obj.time - window.aui.undo_manager.last_item_time < 300) {
                            history_obj.batch_id = window.aui.undo_manager.latest_batch_id;
                        } else {
                            window.aui.undo_manager.latest_batch_id = window.aui.utils.generate_uid();
                            history_obj.batch_id = window.aui.undo_manager.latest_batch_id;
                        }
                    } else {
                        history_obj.batch_id = window.aui.undo_manager.latest_batch_id;
                    }
                }

                window.aui.undo_manager.history.push(history_obj);
                window.aui.undo_manager.last_item_time = history_obj.time;
            },
            undo: function() {
                var i = window.aui.undo_manager.history.length;
                var batch_id = false;

                while (i--) {

                    var history_item = window.aui.undo_manager.history[i];
                    if (history_item.state !== "undone") {

                        if (history_item.batch_id) {

                            if (!batch_id) {
                                batch_id = history_item.batch_id;
                                history_item.undo();
                                history_item.state = "undone";
                            } else {
                                if (batch_id === history_item.batch_id) {
                                    history_item.undo();
                                    history_item.state = "undone";
                                }
                            }
                        } else {
                            history_item.undo();
                            history_item.state = "undone";
                            break;
                        }
                    }
                }


            },
            redo: function() {
                var batch_id = false;

                if (window.aui.undo_manager.history[window.aui.undo_manager.history.length - 1].state !== "undone") {
                    return false;
                }

                for (var i = 0; window.aui.undo_manager.history.length > i; i++) {

                    var history_item = window.aui.undo_manager.history[i];

                    if (history_item.state === "undone") {
                        if (history_item.batch_id) {

                            if (!batch_id) {
                                batch_id = history_item.batch_id;
                                history_item.redo();
                                history_item.state = "redone";
                            } else {
                                if (batch_id === history_item.batch_id) {
                                    history_item.redo();
                                    history_item.state = "redone";
                                }
                            }
                        } else {
                            history_item.redo();
                            history_item.state = "redone";
                            break;
                        }
                    }
                }

            },
            history: []
        },

        /*  aui-selectable
         *
         *  Make html of the form
         *
         *      <div data-selectable-group="example_group"></div>
         *          <div class="selectable-item">Item 1</div>
         *          <div class="selectable-item">Item 2</div>
         *          <div class="selectable-item loading">This shouldn't be selectable</div>
         *      </div>
         *
         *  selectable with the following:
         *
         *      window.aui.selectable.create('example_group', {
         *          filter: '.selectable-items:not(.aui-table-loading)',
         *          key_controls: false
         *      });
         *
         *  This will add a 'selectable-uid' attribute to each element that satisfies the
         *  'filter' paramater e.g.
         *
         *      ...
         *      <div class="selectable-item" data-selectable-uid="4c8f">Item 2</div>
         *      ...
         *
         *  And an entry to the window.aui.selectables['example_group'].items object:
         *
         *      items = {
         *          ...,
         *          4c8f: 'selected',
         *          f7hj: false,
         *          ...
         *      }
         *
         */
        selectables: [],

        selectable: {

            event_handlers: function() {
                var that = this;
                $('body').off('click.update_selectable').on('click.update_selectable', '[data-selectable-uid]', function (event) {
                    if (!$(event.target).closest('a, button').length) {
                        that.click_selectable($(this), event);
                    }
                });
            },

            click_selectable: function ($elem, event) {
                var uid = $elem.attr('data-selectable-uid');
                var group = $elem.closest('[data-selectable-group]').attr('data-selectable-group');
                var selectable = this.get_by_uid(group, uid);
                var settings = window.aui.selectables[group].settings;

                if (selectable !== 'selected') {
                    this.update_selectable(group, uid, 'state', 'selected', {
                        event: event
                    });
                } else if (settings.unselect_on_click) {
                    this.update_selectable(group, uid, 'state', false, {
                        event: event
                    });
                }
            },

            create: function (selectable_group, options) {
                var selectable_container = $("[data-selectable-group='" + selectable_group + "']");
                var settings = $.extend({
                        key_controls: true,
                        unselect_on_click: true
                    }, options);
                var public_api = {};

                public_api.add = function () {
                    return window.aui.selectable.add_selectables.apply(window.aui.selectable, [selectable_group]);
                };
                public_api.reset = function () {
                    return window.aui.selectable.reset(window.aui.selectable, [selectable_group]);
                };
                public_api.select = function (uid) {
                    return window.aui.selectable.update_selectable(selectable_group, uid, "state", "selected");
                };
                public_api.unselect = function (uid) {
                    return window.aui.selectable.update_selectable(selectable_group, uid, "state", false);
                };

                if (!window.aui.selectables) {
                    window.aui.selectables = {};
                }
                if (!window.aui.selectables[selectable_group]) {
                    window.aui.selectables[selectable_group] = {
                        settings: settings,
                        items: {}
                    };
                    if (selectable_container.length) {
                        public_api.add(selectable_group);
                    }
                }
                return public_api;
            },

            /* Iterate through the page, adding each element to the items object */
            add_selectables: function (selectable_group) {
                var $container = $("[data-selectable-group='" + selectable_group + "']");
                var settings = window.aui.selectables[selectable_group].settings;
                var item_ids_in_dom = [];
                $container.find(settings.filter).each(function (index) {
                    var uid = $(this).attr('data-selectable-uid');
                    if (!uid) {
                        var uid = window.aui.utils.get_uid();
                        $(this).attr('data-selectable-uid', uid);
                    }
                    window.aui.selectables[selectable_group].items[uid] = {
                        state: false,
                        index: index + 1,
                        uid: uid
                    };
                    if ($(this).is('[data-selected]')) {
                        window.aui.selectables[selectable_group].items[uid].state = 'selected';
                    }
                    item_ids_in_dom.push(uid);
                });
                this.remove_old_selectables(selectable_group, item_ids_in_dom);
                window.aui.selectable.event_handlers();
                if (settings.key_controls) {
                    window.aui.selectable.key_controls(selectable_group);
                }
            },

            /* If old elements no longer exist in the dom, remove them from the js items object */
            remove_old_selectables: function (selectable_group, item_ids_in_dom) {
                var items = window.aui.selectables[selectable_group].items;
                for (var item_id in items) {
                    if (!item_ids_in_dom.includes(item_id)) {
                        delete items[item_id];
                    };
                }
            },

            reset: function(group_name) {
                if (window.aui.selectables[group_name]) {
                    window.aui.selectables[group_name].items = {};
                }
            },

            destroy: function(group_name) {
                if (window.aui.selectables[group_name]) {
                    delete window.aui.selectables[group_name];
                }
            },
            /*
             * Update the selectables object, and execute the callback functions.
             * This function is called every time the selection changes.
             *
             * Options
             * ----------
             * callback: function to call on select
             * event: event passed in from the event handler - this is used to check state of metakey and shiftkey
             */
            update_selectable: function (group_name, uid, property, value, options) {


                var settings = $.extend({
                    callback: false,
                    scroll: false,
                    event: false
                }, options);

                if (uid) {
                    var selectable = this.get_by_uid(group_name, uid);
                } else {
                    selectable = window.aui.selectable.get_selected(group_name);
                    uid = selectable.uid;
                }

                if ($.isEmptyObject(selectable)) {
                    return;
                }

                var meta_key = settings.event ? (settings.event.ctrlKey || settings.event.metaKey) : false;
                var selectable_list = window.aui.selectables[group_name];
                var selectable_settings = selectable_list.settings;

                if (!(selectable && selectable_list)) {
                    return;
                }

                var always_select_multiple = (selectable_settings.multi_select && selectable_settings.multi_select !== "metakey");
                var select_multiple_disabled = true;
                if (settings.event) {
                    select_multiple_disabled = !settings.event.shiftKey && !meta_key;
                }

                if (!always_select_multiple && select_multiple_disabled || !selectable_settings.multi_select) {
                    if (window.aui.selectable.active_selectable_name) {
                        window.aui.selectable.unselect_selectables(window.aui.selectable.active_selectable_name);
                    }
                }

                selectable_list.items[uid][property] = value;

                if (property === "state" && value === "selected") {
                    window.aui.selectable.select_selectable(group_name, uid);
                } else if (property === "state" && value !== "selected") {
                    window.aui.selectable.unselect_selectable(group_name, uid);
                }

                window.aui.selectable.active_selectable_name = group_name;
                window.aui.selectable.last_selected = uid;

                if (window.aui.selectable.on_change) {
                    window.aui.selectable.on_change(group_name, uid, property, value);
                }

                /* pass the name of the selectable group, the uid of the changed
                item, and a bool value for whether it's selected or not */
                $('[data-selectable-uid="' + uid + '"]').trigger('aui_select', [group_name, uid, value]);

                if (settings.callback) {
                    settings.callback(group_name, uid, property, value);
                }

                if (settings.scroll) {
                    settings.scroll();
                }
            },

            select_next: function (group_name, options) {
                var settings = $.extend({}, options),
                    selectable_group = group_name || window.aui.selectable.active_selectable_name,
                    event = settings.event || event;

                var next_index = this.get_selected(group_name).index + 1;
                var next_uid = this.get_by_index(group_name, next_index).uid;

                window.aui.selectable.update_selectable(selectable_group, next_uid, "state", "selected", {
                    event: event,
                    scroll: settings.scroll
                });
            },

            select_previous: function (group_name, options) {
                var settings = $.extend({}, options),
                    selectable_group = group_name || window.aui.selectable.active_selectable_name,
                    event = settings.event || event;

                var prev_index = this.get_selected(group_name).index - 1;
                var prev_uid = this.get_by_index(group_name, prev_index).uid;

                window.aui.selectable.update_selectable(selectable_group, prev_uid, "state", "selected", {
                    event: event,
                    scroll: settings.scroll
                });
            },

            select_selectable: function (group_name, uid) {
                $('[data-selectable-group="' + group_name + '"]').find('[data-selectable-uid="' + uid + '"]').attr('data-selected', true);
            },

            unselect_selectable: function (group_name, uid) {
                $('[data-selectable-group="' + group_name + '"]').find('[data-selectable-uid="' + uid + '"]').removeAttr('data-selected');
            },

            unselect_selectables: function (group_name) {
                var selectables = window.aui.selectables[group_name];
                for (var index in selectables.items) {
                    selectables.items[index].state = false;
                }
                $('[data-selectable-group="' + group_name + '"]').find('[data-selectable-uid]').removeAttr('data-selected');
            },

            /* Returns the selected DOM element */
            get_selected_elem: function (group_name) {
                return $('[data-selectable-group="' + group_name + '"]').find('[data-selected]');
            },

            /* Return the item for the selected element */
            get_selected: function (group_name) {
                if (!window.aui.selectables[group_name]) {
                    return {};
                }
                var items = window.aui.selectables[group_name].items
                for (var uid in items) {
                    if (items[uid].state == 'selected') {
                        return items[uid];
                    }
                }
                this.add_selectables(group_name);
                return {}
            },

            /* Return the selectable object based on its selectable uid */
            get_by_uid: function (group_name, uid) {
                return ((window.aui.selectables[group_name] || {}).items || {})[uid];
            },

            /* Return the selectable object based on its selectable index */
            get_by_index: function (group_name, index) {
                var items = window.aui.selectables[group_name].items
                for (var uid in items) {
                    if (items[uid].index == index) {
                        return items[uid];
                    }
                }
                return {}
            },

            /*
             * Setup event handlers for arrow keys to select items in a list.
             *
             * For performance reasons, the functions are debounced. This prevents the functions from
             * queueing up when too many events are fired.
             *
             * TODO: Make sure key_controls work with a specified selectable group only!
             *
             */
            key_controls: function(group_name) {

                var scroll_function = window.aui.utils.debounce(function () {
                    var selected_element = $("[data-selectable-uid='" + window.aui.selectable.last_selected + "']");
                    window.aui.scroll_to_element(selected_element, 500);
                }, 5);

                var select_previous = window.aui.utils.debounce(function (event) {
                    window.aui.selectable.select_previous(group_name, {
                        event: event,
                        scroll: scroll_function
                    });
                }, 5);

                var select_next = window.aui.utils.debounce(function (event) {
                    window.aui.selectable.select_next(group_name, {
                        event: event,
                        scroll: scroll_function
                    });
                }, 5);

                // TODO: make shortcuts for adding/removing selection (for multiple selections)
                var shortcuts = [
                    {
                        name: group_name + '_select_next_selectable',
                        key_code: 40,
                        method: function(options) {
                            select_next(options.event);
                        },
                        // condition: function() {
                        //     var selected_items = window.aui.selectable.get_selected(window.aui.selectable.active_selectable_name);
                        //     return selected_items;
                        // },
                        override_identical_keycodes: true,
                        allow_for_popup: true
                    },
                    {
                        name: group_name + '_select_prev_selectable',
                        key_code: 38,
                        method: function(options) {
                            select_previous(options.event);
                        },
                        // condition: function() {
                        //     var selected_items = window.aui.selectable.get_selected(window.aui.selectable.active_selectable_name);
                        //     return selected_items;
                        // },
                        override_identical_keycodes: true,
                        allow_for_popup: true
                    }

                ];

                window.aui.keyboard_shortcut.set_keyboard_shortcuts(shortcuts);
            },

            // NOTE: THE FOLLOWING DISABLED CODE INCLUDES THE FUNCTIONALITY FOR SELECTING MULTIPLE (DON'T REMOVE YET)
            //
            //            xkey_controls: function(name) {
            //
            //                /*
            //                 * Setup event handlers for arrow keys to select items in a list.
            //                 *
            //                 * For performance reasons, the functions are debounced. This prevents the functions from
            //                 * queueing up when too many events are fired.
            //                 *
            //                 * TODO: Make key_controls work with a specified selectable group only!
            //                 * TODO: Use the generic keyboard_shortcut methods to achieve this.
            //                 *
            //                */
            //
            //                if (!window.aui.selectable.key_controls_set) {
            //
            //                    var scroll_function = window.aui.utils.debounce(function() {
            //                        var selected_element = $("[data-selectable-uid='" + window.aui.selectable.last_selected + "']");
            //                        window.aui.scroll_to_element(selected_element, 500);
            //                    }, 5);
            //
            //                    var update_selected = window.aui.utils.debounce(function(event, selected, state, item_to_update) {
            //                        var selectable_id = window.aui.selectable.get_selectable_by_index(window.aui.selectable.active_selectable_name, item_to_update);
            //                        window.aui.selectable.update_selectable(window.aui.selectable.active_selectable_name, selectable_id, "state", state, {
            //                            event: event,
            //                            scroll: scroll_function
            //                        });
            //                    }, 5);
            //
            //
            //                    $(document).on("keydown", function(event) {
            //
            //                        var meta_key = event.ctrlKey || event.metaKey;
            //                        var selected_items = window.aui.selectable.get_selected(window.aui.selectable.active_selectable_name);
            //
            //                        var selectable_settings = window.aui.selectables[name].settings,
            //                            last_selected = window.aui.selectable.get_by_uid(window.aui.selectable.active_selectable_name, window.aui.selectable.last_selected);
            //
            //
            //                        if (selected_items) {
            //
            //                            if (event.keyCode === 38) {
            //
            //                                // up key
            //                                event.preventDefault();
            //
            //                                if (event.shiftKey && !meta_key && (selected_items.length > 1) && (last_selected.index > selected_items[0])) {
            //                                    // unselect the last selected item - this lets us reduce the selection with the arrow keys
            //                                    update_selected(event, selected_items, false, selected_items[selected_items.length - 1]);
            //                                } else {
            //                                    // select the item before the first selected item
            //                                    update_selected(event, selected_items, "selected", selected_items[0] - 1);
            //                                }
            //
            //                            } else if (event.keyCode === 40) {
            //
            //                                // down key
            //                                event.preventDefault();
            //
            //                                // if shift key is pressed and cmd key isn't pressed and more than one item is selected and the selected element index is smaller than the index of the highest index selected item
            //                                if (event.shiftKey && !meta_key && (selected_items.length > 1) && (last_selected.index < selected_items[selected_items.length - 1])) {
            //                                    // unselect the first selected item - this lets us reduce the selection with the arrow keys
            //                                    update_selected(event, selected_items, false, selected_items[0]);
            //                                } else {
            //                                    // select the item after the last selected item
            //                                    update_selected(event, selected_items, "selected", selected_items[selected_items.length - 1] + 1);
            //                                }
            //
            //                            }
            //
            //                        }
            //
            //                    });
            //
            //                }
            //
            //                window.aui.selectable.key_controls_set = true;
            //
            //            }
        },

        input: {

            create_input: function(type, options) {
                /*
                 * Creates a standard Artlogic UI element.
                 *
                 * Elements are created from the html templates located
                 * here: public/lib/core/ui/>>version<</templates/elements.html
                 *
                 * This function returns the html, so you would normally use it
                 * like this:
                 *
                 * $("#some-div").append(create_element("radio", {
                 *      id: "my-radio-button",
                 *      radio_options: {
                 *          {label: "Option A", value: "a"},
                 *          {label: "Option B", value: "b"}
                 *      }
                 * }));
                 *
                 * Each element is added to the window.aui.elements object, which is
                 * kept up to date automatically.
                 *
                 * Available types: slider, radio, text
                 *
                 *
                */

                var settings = $.extend({
                    type: type,
                    value: 1,
                    min: 0,
                    max: 3,
                    step: 1,
                    callback: false
                }, options);


                var source = $("#aui-" + type + "-template").html();
                var template = Handlebars.compile(source);
                var html = template(settings);

                switch(type) {
                    case "slider":
                        var code = '<script>$("#aui-slider-" + "' + settings.fieldname + '").slider({' +
                            'value: ' + settings.value + ',' +
                            'min: ' + settings.min + ',' +
                            'max: ' + settings.max + ',' +
                            'step: ' + settings.step + ',' +
                            'slide: ' + settings.slide +
                        '});</script>';

                        html += code;

                        $("body").on("slide", "#aui-slider-" + settings.fieldname, function(event, ui) {
                            window.aui.input.update_input(settings.fieldname, "value", ui.value, settings.callback);
                        });

                        break;

                    case "radio":

                        for (var i = settings.radio_options.length - 1; i >= 0; i--) {
                            $("body").on("change", "#aui-radio-" + settings.radio_options[i].value + "-" + settings.fieldname, function(event) {
                                window.aui.input.update_input(settings.fieldname, "value", this.value, settings.callback);
                            });
                        };

                        break;

                    case "text":

                        $("body").on("keyup paste blur", "#aui-text-" + settings.fieldname, function(event) {

                            window.aui.input.update_input(settings.fieldname, "value", $(this).text(), settings.callback);
                        });

                        break;
                }

                window.aui.inputs[settings.fieldname] = settings;

                return html;

            },

            update_input: function(fieldname, property, value, callback) {

                /*
                 * Update the input object, dependencies and listeners,
                 * and execute the callback functions.
                 *
                 * This function is called every time an input changes.
                */

                window.aui.inputs[fieldname][property] = value;

                window.aui.input.apply_input_dependencies(fieldname, value);

                window.aui.input.update_input_listeners(fieldname, value);

                if(window.aui.input.on_change) {
                    window.aui.input.on_change(fieldname, property, value);
                }

                $("[data-fieldname='" + fieldname + "']").trigger("aui_input_change", [fieldname, property, value]);

                if(callback) {
                    callback(fieldname, property, value);
                }
            },

            update_inputs: function() {

                /*
                 * Update all inputs to their corresponding values in the window.aui.inputs object.
                 *
                */

                $.each(window.aui.inputs, function(fieldname, object) {
                    var input = $("[data-fieldname='" + fieldname + "']");

                    switch (object.type) {
                        case "slider":
                            if (window.aui.inputs[fieldname].value) {
                                input.find(".aui-slider").slider("option", "value", window.aui.inputs[fieldname].value);
                            }

                            window.aui.input.update_input_listeners(fieldname, window.aui.inputs[fieldname].value);
                            break;

                        case "radio":
                            if (window.aui.inputs[fieldname].value) {
                                input.find("[type='radio'][value='" + window.aui.inputs[fieldname].value + "']").attr("checked", true);
                            }

                            window.aui.input.update_input_listeners(fieldname, window.aui.inputs[fieldname].value);
                            break;
                    }
                });


            },

            update_input_listeners: function(fieldname, value) {

                /*
                 * Update all input listeners for a given input.
                 *
                 * Input listeners are elements on the page which display
                 * the value of an input and update automatically.
                 *
                 * To make an input listener, create an element and give
                 * it the following attribute with a fieldname of your choice
                 *
                 * data-input-listener=">>fieldname<<"
                */

                $("[data-input-listener='" + fieldname + "']").html(value);
            },

            apply_input_dependencies: function(fieldname, value) {

                // manage dependencies
                if(window.aui.inputs[fieldname].dependencies) {

                    for (var i = window.aui.inputs[fieldname].dependencies.length - 1; i >= 0; i--) {

                        var dependent_element = window.aui.inputs[fieldname].dependencies[i].fieldname,
                            dependency_event = window.aui.inputs[fieldname].dependencies[i].event,
                            dependency_condition = window.aui.inputs[fieldname].dependencies[i].condition;

                        switch(dependency_event) {

                            /*
                             * Disable an input - set the state to disabled, and the
                             * aui-disabled class and if it's a slider disable it.
                            */

                            case "disable":
                                if(($.isArray(dependency_condition) && $.inArray(value, dependency_condition) !== -1) || value === dependency_condition) {
                                    $("[data-fieldname='" + dependent_element + "']").addClass("aui-disabled");
                                    window.aui.inputs[dependent_element].state = "disabled";
                                    if (window.aui.inputs[dependent_element].type === "slider") {
                                        $("[data-fieldname='" + dependent_element + "'].aui-disabled .aui-slider").slider("disable");
                                    }
                                } else {
                                    $("[data-fieldname='" + dependent_element + "']").removeClass("aui-disabled");
                                    window.aui.inputs[dependent_element].state = "active";

                                    if (window.aui.inputs[dependent_element].type === "slider") {
                                        $("[data-fieldname='" + dependent_element + "'] .aui-slider").slider("enable");
                                    }
                                }
                                break;

                            /*
                             * Limit an input - currently only applies to sliders.
                             * The slider will be limited to a maximum value.
                             *
                             * TODO: Enhance functionality to limit to a range of values
                            */

                            case "limit":
                                if(($.isArray(dependency_condition) && $.inArray(value, dependency_condition) !== -1) || value === dependency_condition) {
                                    switch(window.aui.inputs[dependent_element].type) {
                                        case "slider":
                                            $("[data-fieldname='" + dependent_element + "']").find(".aui-slider").slider("option", "max", window.aui.inputs[fieldname].dependencies[i].event_options);
                                            break;
                                    }
                                } else {
                                    switch(window.aui.inputs[dependent_element].type) {
                                        case "slider":
                                            $("[data-fieldname='" + dependent_element + "']").find(".aui-slider").slider("option", "max", window.aui.inputs[dependent_element].max);
                                            break;
                                    }
                                }
                                break;

                        }
                    };
                }
            },

            add_inputs: function() {

                /*
                 * Turn an input into an Artlogic UI input.
                 *
                 * Input types: Text, Radio, Slider, Checkbox
                 *
                 * This function grabs all elements with the class 'aui-input'
                 * and adds them to the window.aui.inputs object.
                 *
                */

                $(".aui-input").each(function() {
                    var input_obj = $(this),
                        fieldname = input_obj.data("fieldname"),
                        default_value = input_obj.data("value"),
                        min = input_obj.find(".aui-slider").data("min"),
                        max = input_obj.find(".aui-slider").data("max"),
                        type = "";

                    if (input_obj.find(".aui-slider").length) {
                        type = "slider";
                    } else if (input_obj.find("input[type='radio']").length) {
                        type = "radio";
                    } else if (input_obj.find("input[type='text']").length) {
                        type = "text";
                    } else if (input_obj.find("input[type='checkbox']").length) {
                        type = "checkbox";
                    }

                    window.aui.inputs[fieldname] = {
                        type: type,
                        value: default_value,
                        dependencies: [],
                        min: min,
                        max: max
                    };

                    // convert all slider elements to jquery ui slider
                    input_obj.find(".aui-slider").slider({
                        min: min,
                        max: max
                    });

                    window.aui.input.set_input_event_handlers(input_obj, fieldname);

                });

                window.aui.input.update_inputs();
            },

            set_input_event_handlers: function(input_obj, fieldname) {

                /*
                 * Set the event handlers for Artlogic UI inputs.
                */

                input_obj.on("slide", ".aui-slider", function(event, ui) {
                    if (window.aui.inputs[fieldname].state !== "disabled") {
                        window.aui.input.update_input(fieldname, "value", ui.value);
                    }
                });

                input_obj.on("change", "input[type='radio']", function(event) {
                    if (window.aui.inputs[fieldname].state !== "disabled") {
                        window.aui.input.update_input(fieldname, "value", this.value);
                    }
                });

                input_obj.on("change", "input[type='text']", function(event) {
                    if (window.aui.inputs[fieldname].state !== "disabled") {
                        window.aui.input.update_input(fieldname, "value", this.value);
                    }
                });

                input_obj.on("change", "input[type='checkbox']", function(event) {
                    if (window.aui.inputs[fieldname].state !== "disabled") {
                        if ($(this).is(":checked")) {
                            window.aui.input.update_input(fieldname, "value", this.value);
                        } else {
                            window.aui.input.update_input(fieldname, "value", false);
                        }
                    }
                });

            },

            set_input_dependency: function(trigger_element, condition, dependent_element, event, event_options) {

                /*
                 * Set a dependency for an Artlogic UI input.
                 *
                 * trigger_element: The input that triggers the condition.
                 *
                 * condition: The value of Element that triggers the event.
                 *
                 * dependent_element: The element that is affected by the event.
                 *
                 * event: An event, such as 'disable' or 'limit'.
                 *
                 * event_options: Options for certain events that need options.
                */

                if (window.aui.inputs[trigger_element]) {
                    window.aui.inputs[trigger_element].dependencies.push({
                        fieldname: dependent_element,
                        event: event,
                        event_options: event_options,
                        condition: condition
                    });
                } else {
                    console.log("Input doesn't exist. Call set_input_dependencies after input has been created/added.");
                }

                window.aui.input.apply_input_dependencies(trigger_element, window.aui.inputs[trigger_element].value);

            }


        },

        inputs: {
            /*
             * This is where inputs are listed with
             * their settings and current values.
             * The value of an input is stored in the 'value'
             * property.
            */
        },

        close_stickybox: function() {
            $(".aui-stickybox").remove();
            $("[data-sticky-element]").removeAttr("data-sticky-element");
        },

        utils: {
            value_numbers: function(property, value) {

                /*
                 * Convert a string to a number or vice versa,
                 * depending on which value is sent.
                 *
                 * ARGUMENTS
                 * ----------------
                 *
                 * property: the key for one of the arrays in the properties obj
                 *
                 * value: Either an index (number) or a value (string) of the property
                */

                var return_value,

                // add properties here

                properties = {
                    column_spacing: ["xs", "s", "m", "l", "xl"],
                    row_spacing: ["none", "xs", "s", "m", "l", "xl"],
                    image_size: ["xxxs", "xxs", "xs", "s", "m", "l", "xl", "xxl"]
                }

                if(properties[property.replace("-", "_")]) {
                    if(typeof value === "number") {
                        return_value = properties[property.replace("-", "_")][value - 1];
                    } else {
                        return_value = properties[property.replace("-", "_")].indexOf(value) + 1;
                    }

                    return return_value;
                } else {
                    return false;
                }

            },

            hash: {
                /*
                 * TODO: This is incomplete - needs work or just scrap it
                 *
                 */
                update: function(index) {
                    // update the id hash in the url (use location.replace instead of location.hash to make browser history ignore the changes)
                    if($("[data-index='" + index + "']").data("id")) {
                        window.location.replace(('' + window.location).split('#')[0] + '#' + $("[data-index='" + index + "']").data("id"));
                    }
                }
            },

            one_way_hash: function(str) {
                /* sha1 one-way hash. See: http://phpjs.org/functions/sha1/ */
                var rotate_left = function (n, s) { var t4 = (n << s) | (n >>> (32 - s)); return t4; }; var cvt_hex = function (val) { var str = ''; var i; var v; for (i = 7; i >= 0; i--) { v = (val >>> (i * 4)) & 0x0f; str += v.toString(16); } return str; }; var blockstart; var i, j; var W = new Array(80); var H0 = 0x67452301; var H1 = 0xEFCDAB89; var H2 = 0x98BADCFE; var H3 = 0x10325476; var H4 = 0xC3D2E1F0; var A, B, C, D, E; var temp; str = unescape(encodeURIComponent(str)); var str_len = str.length; var word_array = []; for (i = 0; i < str_len - 3; i += 4) { j = str.charCodeAt(i) << 24 | str.charCodeAt(i + 1) << 16 | str.charCodeAt(i + 2) << 8 | str.charCodeAt(i + 3); word_array.push(j); } switch (str_len % 4) { case 0: i = 0x080000000; break; case 1: i = str.charCodeAt(str_len - 1) << 24 | 0x0800000; break; case 2: i = str.charCodeAt(str_len - 2) << 24 | str.charCodeAt(str_len - 1) << 16 | 0x08000; break; case 3: i = str.charCodeAt(str_len - 3) << 24 | str.charCodeAt(str_len - 2) << 16 | str.charCodeAt(str_len - 1) << 8 | 0x80; break; } word_array.push(i); while ((word_array.length % 16) != 14) { word_array.push(0); } word_array.push(str_len >>> 29); word_array.push((str_len << 3) & 0x0ffffffff); for (blockstart = 0; blockstart < word_array.length; blockstart += 16) { for (i = 0; i < 16; i++) { W[i] = word_array[blockstart + i]; } for (i = 16; i <= 79; i++) { W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1); } A = H0; B = H1; C = H2; D = H3; E = H4; for (i = 0; i <= 19; i++) { temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff; E = D; D = C; C = rotate_left(B, 30); B = A; A = temp; } for (i = 20; i <= 39; i++) { temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff; E = D; D = C; C = rotate_left(B, 30); B = A; A = temp; } for (i = 40; i <= 59; i++) { temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff; E = D; D = C; C = rotate_left(B, 30); B = A; A = temp; } for (i = 60; i <= 79; i++) { temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff; E = D; D = C; C = rotate_left(B, 30); B = A; A = temp; } H0 = (H0 + A) & 0x0ffffffff; H1 = (H1 + B) & 0x0ffffffff; H2 = (H2 + C) & 0x0ffffffff; H3 = (H3 + D) & 0x0ffffffff; H4 = (H4 + E) & 0x0ffffffff; } temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4); return temp.toLowerCase();
            },

            html_encode: function(html) {

                $("body").append("<div id='aui-html-encode-element' style='display: none;'>" + html + "</div>")
//                $("#aui-html-encode-element").append(html);
                var encoded_html = $("#aui-html-encode-element").html();
                $("#aui-html-encode-element").remove();

                return encoded_html
            },
            debounce: function(func, wait, immediate) {

                /*
                 * Debounce function, commonly used in scroll event handlers
                 *
                 * ARGUMENTS
                 * ---------
                 *
                 * func: the function to debounce
                 *
                 * wait: the amount of time (ms) before the function should be called
                 *
                 *
                 * EXAMPLE
                 * -------
                 *
                 *   $("#aui-wrapper").scroll(function() {
                 *       window.aui.utils.debounce(function() {
                 *           // do something, but only after 500 milliseconds
                 *       }, 500);
                 *   });
                 *
                */

                var timeout;
                return function() {
                    var context = this, args = arguments;
                    var later = function() {
                            timeout = null;
                            if (!immediate) func.apply(context, args);
                    };
                    var callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) func.apply(context, args);
                };

            },

            load_json_from_url: function(options) {

                /*
                 * ARGUMENTS
                 * =========
                 *
                 * options.url
                 * -----------
                 * type: string
                 * description: URL pointing to the file that contains JSON data
                 *
                 * options.data
                 * ------------
                 * type: object
                 * description: data to send to the url
                 *
                 * options.success
                 * ---------------
                 * type: function
                 * description: Function to be called on success
                 *
                 * options.error
                 * -------------
                 * type: function
                 * description: Function to be called on error
                 *
                 *
                 * DEPENDENCIES
                 * ============
                 * JQuery
                 *
                 */

                // dependencies
                var _overlay_box = window.aui.overlay_box;

                var settings = $.extend({
                    error: function() {
                        _overlay_box.load({
                            content: "<h3>Sorry - something went wrong.</h3><p>An error occurred loading JSON data. " +
                                "If this problem persists, please contact technical support with details of this error, the page " +
                                "you were on and what you were doing at the time.</p>",
                            box_width: "400px"
                        });
                    }
                }, options);

                $.getJSON(settings.url, settings.data, function(return_data) {
                    var data = return_data;

                    if (settings.success) {
                        settings.success(data);
                    }
                }).fail(function(jqxhr, textStatus, error) {
                    if (settings.error) {
                        settings.error(jqxhr, textStatus, error);
                    }
                });
            },

            is_iframe: function() {
                try {
                    return window.self !== window.top;
                } catch (e) {
                    return true;
                }
            },

            object_length: function(obj) {

                /*
                 * Get the length of an object.
                 *
                 * ARGUMENTS
                 * ---------
                 *
                 * obj: the object you want to know the length of
                 *
                */

                var obj_length = 0,
                    key;

                for (key in obj) {
                    if (obj.hasOwnProperty(key)) obj_length++;
                }
                return obj_length;

            },
            is_function: function(obj) {
                return !!(obj && obj.constructor && obj.call && obj.apply);
            },
//            custom_image_url: function(url, size, force) {
//                /* return a custom image url at the specified size */
//                if (force && size.indexOf('f') == -1) {
//                    size += 'f';
//                }
//                if (url.indexOf('http://') == 0) {
//                    url = '/custom_images/' + size + '/' + url.split('http://').join('h/');
//                } else if (url.indexOf('https://') == 0) {
//                    url = '/custom_images/' + size + '/' + url.split('https://').join('s/');
//                } else if (url.indexOf('/custom_images/') == 0) {
//                    var segs = url.split('/');
//                    url = '/' + segs.splice(3, segs.length - 3).join('/');
//                    url = '/custom_images/' + size + url;
//                } else if (url.indexOf('/') == 0) {
//                    url = '/custom_images/' + size + url;
//                }
//                return url;
//            },
//            get_image_crop: function(image_crop) {
//                var return_value = "";
//
//                $.each(window.aui.image_crops, function(index, value) {
//                    if (value[0] === image_crop) {
//                        return_value = value[1];
//                    }
//                });
//
//                return return_value;
//            },
            in_array: function(item, array) {
                var in_array = false,
                    i = array.length;
                while (i--) {
                    if (array[i] === item) {
                        in_array = true;
                    }
                }
                return in_array;
            },
            responsivise_settings: function(settings) {
                if (settings.responsive) {
                    var window_width = window.aui.meta.window_width;
                    $.each(settings.responsive, function(key, value) {
                        var width = key.split("-");

                        if (window_width > parseInt(width[0]) && window_width < parseInt(width[1])) {
                            $.extend(settings, value);
                            //window.aui.grid.current_settings[settings.id] = key;
                        }

                    });
                }
            },
            get_uid: function() {

                var _get_uid = window.aui.utils.get_uid,
                    _in_array = window.aui.utils.in_array;
                // put part of this into a get_random_string function

                if (!_get_uid.existing) {
                    _get_uid.existing = [];
                }

                var id = Math.floor((1 + Math.random()) * 0x10000)
                       .toString(16)
                       .substring(1);

                var exists = _in_array(id, _get_uid.existing);

                if (!exists) {
                    _get_uid.existing.push(id);
                    return id;
                } else {
                    return _get_uid();
                }

            },
            generate_uid: function() {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                       .toString(16)
                       .substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                       s4() + '-' + s4() + s4() + s4();
            },
            get_time: function() {
                // taken from underscore.js
                // ---------------------------------
                // A (possibly faster) way to get the current timestamp as an integer.
                var now = Date.now || function() {
                    return new Date().getTime();
                };

                return now();
            },
            log: function(bool, args) {
                /* logging called from other modules... */
                if (bool) {
                    var _args = [];
                    for (var i = 0; i < args.length; i ++) {
                        _args[i] = args[i];
                    }
                    console.log("%c aui log:", window.aui.log_style, _args);
                }
            },
            get_item_by_id: function(dataset, id) {
                return this.get_item_by_property(dataset, id, "id");
            },
            get_items_by_ids: function(dataset, ids) {

                var items = [];

                for (var i = 0; ids.length>i; i++) {
                    items.push(window.ace.utils.get_item_by_id(dataset, ids[i]));
                }

                return items;

            },
            get_item_by_property: function(dataset, property_value, property_name) {
                var item, i;

                if (dataset) {
                    i = dataset.length;

                    while (i--) {
                        if (dataset[i][property_name] == property_value) {
                            item = dataset[i];
                        }
                    }
                }

                return item;
            }
        }

    };

})(jQuery);

window.aui.fileupload = {

        // TODO: REFACTOR

        settings: {
            logging: false
        },

        log: function() {
//            window.ce.utils.log(this.settings.logging, arguments);
        },

        init: function(element, options) {
            // dependencies
            var _fileupload = window.aui.fileupload,
                _overlay_box = window.aui.overlay_box,
                _utils = window.aui.utils;

            // public properties
            _fileupload.current_uploads = {};
            _fileupload.current_upload_uid = _utils.get_uid();
            _fileupload.current_uploads[_fileupload.current_upload_uid] = {
                dropzone: options.dropZone
            };
            _fileupload.current_upload = {};

            // private variables
            var settings = $.extend({
                max_file_size: 10000000, // 10 MB
                succes: false,
                error: false
            }, options);

            _fileupload.settings.event_name = settings.event_name;
            _fileupload.show_existing();

            // create progress bar elements if they do not already exist...
            if (!$('#aui-fileupload-progress').length) {
                $('body').append('<div id="aui-fileupload-progress"><div class="aui-fileupload-bar"></div></div>');
            }

            // JOSEF: helper variable for us to keep track of unfinished uploads
            var filecount = 0;

            // jquery fileuplaod plugin
            // JOSEF: extended the arguments with settings as defined above
            $(element).fileupload(
                $.extend({
                    dataType: 'json',
                    sequentialUploads: true,
                    headers: { 'X-CSRF-Token': $('meta[name="csrf_token"]').attr('content')},
                    //acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
                    maxFileSize: 10000000, // 10 MB
                    add: function (e, data) {
                        // JOSEF: file is added, increase the count of unfinished uploads
                        filecount++;

                        _fileupload.show_progress_bar();

                        _fileupload.current_upload = _fileupload.current_uploads[_fileupload.current_upload_uid];

                        if (data && data.originalFiles && data.originalFiles.length && !_fileupload.current_upload['no_of_files']) {
                            _fileupload.current_upload['is_file_upload'] = true;
                            _fileupload.current_upload['no_of_files'] = data.originalFiles.length;
                            _fileupload.current_upload['no_of_files_added'] = 0;
                            _fileupload.current_upload['files_received'] = [];
                        }

                        _fileupload.current_upload['no_of_files_added'] += 1;

                        if (!dropper_data) {
                            var dropper_data = {row_id: "uploaded-artworks", dropper_id: "uploaded-artworks"};
                        }

                        var data_to_send_in_paramname = {
                            upload_uid: _fileupload.current_upload_uid,
                            file_n_of: [_fileupload.current_upload['no_of_files_added'], _fileupload.current_upload['no_of_files']],
                            row_id: dropper_data.row_id,
                            dropper_id: dropper_data.dropper_id,
                            row_selector: '#' + dropper_data.row_id,
                            dropper_selector: '#' + dropper_data.dropper_id
                        }
                        data['paramName'] = 'files[' + JSON.stringify(data_to_send_in_paramname) + ']';

                        _fileupload.current_upload['row_id'] = dropper_data.row_id;
                        _fileupload.current_upload['row_selector'] = '#' + dropper_data.row_id;

                        // see if we can get a folder name...
                        if (data && data.originalFiles && data.originalFiles.length) {
                            var first = data.originalFiles[0];
                            /* Firefox/Mozilla: Even though in Firebug you can see the attribute
                         * file..mozFullPath, you cannot get its value programatically, for
                         * security reasons. It is therefore not possible to get the directory
                         * name in Firefox when you select a number of files.
                         */
                            if (first.relativePath) { // chrome only
                                var path = ('/' + first.relativePath + '/').split('/');
                                for (var i = 0; i < path.length; i ++) {
                                    if (path[i]) {
                                        var folder_name = path[i];
                                        break;
                                    }
                                }
                            }

                        }

                        _fileupload.current_upload['folder_name'] = folder_name || "";

                        /* don't continue if we only have a single item and its size is zero or type is undefined.
                         * The chances are that if this is the case the user may be attempting
                         * to upload an empty file, or a directory...
                         */
                        if (data && data.originalFiles && data.originalFiles.length == 1) {
                            var size = data.originalFiles[0].size,
                                type = data.originalFiles[0].type;

                            /** TL edit 2015-16-12 no-extension files are ok, let user upload dir if the browser allows it */
                            if (false) {//type === "" || size === 0) {
                                _overlay_box.load({content: "<h1>Unable to upload file</h1><p>You cannot upload this type of file. " +
                                    "If you are trying to upload an entire folder, this is currently only supported by " +
                                    "<a href=\"" + _utils.globals.get_chrome_url + "\" target=\"_blank\">Chrome</a>.</p>", box_width: "360px"});
                                return;
                            }
                        }

                        _fileupload.data = data;
                        _fileupload.upload(data);


                    },

                    progressall: function (e, data) {
                        /* TODO: in the below line, we want to change '100' to '80' and we
                         * reserve 20% of the progress bar for the server-side activity.
                         * We can get the number of files actually received from the
                         * window.fileupload.current_upload object and divide the 20%
                         * with the number of files. As each file comes in we the add the
                         * percentage until the total has reached 20%. This way the progress
                         * bar will only be complete when we have uploaded and PROCESSED
                         * all files.
                         */

                        // dependencies
                        var _fileupload = window.aui.fileupload;

                        // private variables
                        var minimum = 5,
                            files_uploaded_progress = parseInt(data.loaded / data.total * 80, 10),
                            files_received_data = _fileupload.test_received_all_files(true),
                            files_received_progress = 0,
                            files_received = 0,
                            total_files_to_receive = 0,
                            progress = 0;

                        $('#aui-fileupload-progress').show();

                        if (_fileupload.progressbar_timeout) {
                            window.clearTimeout(_fileupload.progressbar_timeout);
                        }

                        if (files_received_data) {
                            var files_received = files_received_data[0];
                            var total_files_to_receive = files_received_data[1];
                        }
                        files_received_progress = parseInt(files_received / total_files_to_receive * 15, 10); // window.fileupload.current_upload
                        progress = minimum + files_uploaded_progress + files_received_progress;

                        $('#aui-fileupload-progress .aui-fileupload-bar').css('width', progress + '%');

                        // JOSEF: commented following 4 rows out, progress bar hidden when the last upload is finished
//                        _fileupload.progressbar_timeout = window.setTimeout(function() {
//                            $('#aui-fileupload-progress .aui-fileupload-bar').css('width', '0%');
//                            $('#aui-fileupload-progress').hide();
//                        }, 3000);

                        if (progress == 100) {
                            _fileupload.log('progress has hit 100%');
                        }
                    },
                    done: function (e, result_data) {
                        // JOSEF: decrease the count of unfinished uploads
                        filecount--;
                        var items = [];
                        $.each($(result_data.result.files), function() {
                            var file = this;
                            if (file.filetype == 'json' && file.embedded_data) {
                                if (file.row_selector) {
                                    var data = file.embedded_data;
                                    row_obj = $(file.row_selector);
                                }
                            } else {
                                // We've received some files...
                                items[items.length] = file;
                            }
                        });
                        // JOSEF: if the count of unfinished uploads reaches zero, the progress bar is hidden
                        if (filecount === 0) {
                            $('#aui-fileupload-progress .aui-fileupload-bar').css('width', '0%');
                            $('#aui-fileupload-progress').hide();
                        }
                    }
                }, settings));
        },

        upload: function(data) {

            /* IMPORTANT: The following lines differ slightly from the docs at
             * http://blueimp.github.io/jQuery-File-Upload/ but see deprication
             * notice here: http://api.jquery.com/jQuery.ajax/#jqXHR
             * The followin jqXHR methods have been renamed:
             * - 'success()' is now 'done()'
             * - 'error()' is now 'fail()'
             * - 'complete()' is now 'always()'
             */

            // dependencies
            var fu = window.aui.fileupload;

            var jqXHR = data.submit()
                .done(function (result, textStatus, jqXHR) {
                    fu.log(textStatus);
                    fu.log(jqXHR);
                    fu.register_received_file({
                        status: 'success',
                        result: result
                    });
                    if (fu.test_received_all_files()) {
                        fu.on_received_all_files();
                    }
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    fu.log(textStatus);
                    fu.register_received_file({
                        status: 'error',
                        error_msg: errorThrown
                    });
                })
                .always(function (result, textStatus, jqXHR) {
                    fu.log(textStatus);
                });
        },

        reset: function() {

            // dependencies
            var _fileupload = window.aui.fileupload,
                _utils = window.aui.utils;

            // reset the fileupload mechanism ready for another fileupload...
            if (_fileupload.current_upload_uid) {
                _fileupload.current_upload_uid = _utils.get_uid();
            }
            if (_fileupload.current_upload) {
                _fileupload.current_upload = {};
            }
            if (_fileupload.current_uploads) {
                _fileupload.current_uploads = {};
                _fileupload.current_uploads[_fileupload.current_upload_uid] = {};
            }
        },

        test_received_all_files: function(return_number_received) {

            // dependencies
            var cu = window.aui.fileupload.current_upload;

            if (cu) { // it may already have been removed if we received a json-data file
                var no_of_files_received = 0;
                if (cu.files_received) {
                    no_of_files_received = cu.files_received.length;
                }
                if (return_number_received) {
                    return [no_of_files_received, cu.no_of_files];
                }
                if (cu.no_of_files && cu.no_of_files == no_of_files_received) {
                    return true;
                } else {
                    return false;
                }
            }
        },

        on_received_all_files: function(files_data, row_obj) {
            // 'files' is optional. Generally it is empty but it may specifically
            // be passed if, for instance, we are pasting into a rte field.

            // dependencies
            var _fileupload = window.aui.fileupload;

            if (files_data && files_data.files) {
                var received_files = [];
                received_files[received_files.length] = {
                    status: 'success',
                    result: files_data
                }
            } else {
                var u = _fileupload.current_upload;
                var received_files = u.files_received;
            }
            _fileupload.log("I have received all files!");
            _fileupload.log('received_files', received_files);


            var data = _fileupload.convert_files_to_grid_data(received_files);

            if (data) {
                _fileupload.log('final received files data', data);
                _fileupload.log('data.rows', data.rows);
                var no_of_items = (data.rows) ? data.rows.length : 0;

                if ($('body').hasClass('ce-rte-focussed')) {
                    var row_id = $('body').attr('data-current_rte_row_id');
                    var row_obj = $('#' + row_id);
                    _fileupload.log('row_id', row_id);
                } else if (!row_obj) {
                    var row_selector = _fileupload.current_upload['row_selector'];
                    var row_obj = $(row_selector);
                }
            }
            // JOSEF: modified event trigger
            var event = jQuery.Event(_fileupload.settings.event_name || "upload");
                event.filedata = data;

            const raw_files_data = [];
            received_files.forEach(file => {
                if (file?.status === 'success' && file?.result?.files) {
                    raw_files_data.push(...file.result.files);
                }
            });
            event.files_data = raw_files_data;

            $("body").trigger(event);

            _fileupload.reset(); // reset the mechanism ready for another go...
        },

        convert_files_to_grid_data: function(received_files) {
            // TURN IT INTO A DATA OBJECT!


            // dependencies
            var _fileupload = window.aui.fileupload;

            // private variables
            var captions_map = {},
                caption_data_file_item = null,
                received_file,
                fileobj,
                file_item,
                original_filename,
                heading,
                content,
                data = {
                    rows: []
                };

            // first check if we have received any excel data containing original filenames and captions
            for (var i = 0; i < received_files.length; i ++) {
                received_file = received_files[i]

                if (received_file && received_file.result && received_file.status == 'success' && received_file.result.files) {
                    $(received_file.result.files).each(function() {
                        file_item = this;
                        if (file_item.filetype == 'excel') {
                            caption_data_file_item = file_item;
                        }
                     });
                 }

            }
            if (caption_data_file_item && caption_data_file_item.excel_data && caption_data_file_item.excel_data.captions_map) {
                _fileupload.log('captions_map', caption_data_file_item.excel_data.captions_map);
                captions_map = caption_data_file_item.excel_data.captions_map;
            }
            for (var i = 0; i < received_files.length; i ++) {
                received_file = received_files[i]
                if (received_file && received_file.result && received_file.status == 'success' && received_file.result.files) {
                    $(received_file.result.files).each(function() {
                        _fileupload.log('adding received file item to received files data', this);
                        file_item = this;
                        _fileupload.log('file_item.filetype', file_item.filetype);
                        _fileupload.log('file_item.original_filename', file_item.original_filename);
                        original_filename = file_item.original_filename;
                        heading = '';
                        content = '';
                        if (original_filename && captions_map[original_filename]) {
                            heading = captions_map[original_filename].heading || '';
                            content = captions_map[original_filename].content || '';
                        }
                        // TODO: add handler for other file types
                        if (file_item.filetype == 'image') {

                            var image_settings = $(_fileupload.current_uploads[_fileupload.current_upload_uid].dropzone).find(".aui-fileupload").data("image-settings");

                            fileobj = {
                                //"heading": heading,
                                //"content": content,
                                //"creation_date": "0000-00-00 00:00:00",
                                //"documents": [],
                                //"images": {
                                //    "default": file_item.url,
                                //    "desktop": file_item.url
                                //},
                                //"settings": {"is_editable": true,"is_live": 1,"is_private": null,"is_processing": 0},
                                //"link_url": "",
                                //"modification_date": "2013-07-09 12:26:45",
                                //"row_caption": '',
                                "uid": file_item.hash,
                                "url_template": file_item.cloudinary_template,
                                "url": file_item.cloudinary_template.replace("__cloudinary_settings__", image_settings || "w_400,h_400"),
                                "file_type": file_item.filetype
                            }
                            data.rows[data.rows.length] = fileobj;
                        }
                    });
                }
            }

            if (data) {
                if (data.rows) {
                    data['page'] = {};
                    var title = '';
                    if (data.rows && data.rows.length > 1 && _fileupload.current_upload && _fileupload.current_upload['folder_name']) {
                        title = _fileupload.current_upload['folder_name'];
                    }
                    if (title) {
                        data['page']['title'] = title;
                    }
                }
            }

            return data;
        },

        register_received_file: function(file) {

            // dependencies
            var _fileupload = window.aui.fileupload;

            if (_fileupload.current_uploads) { // it may already have been removed if we have rendered a data grid...
                var current_upload = _fileupload.current_uploads[_fileupload.current_upload_uid];
                if (!current_upload.files_received) {
                    current_upload.files_received = [];
                }
                current_upload['files_received'][current_upload['files_received'].length] = file;
            }
        },

        show_existing: function() {
            var existing_json = $('#fileupload').attr('data-existing');
            if (existing_json) {
                var existing = eval('(' + existing_json + ')');
                $("#ce-image_row_template").tmpl(existing.files).appendTo('#fileupload_files')
                if (existing.total_files > existing.number_to_display) {
                    var file_details = 'and ' + (existing.total_files - existing.number_to_display) + ' more...';
                    $('#ce-basic_row_template').tmpl({'label': '&nbsp;', content: file_details}).appendTo('#fileupload_files')
                }
            }
        },

        progress_dismiss_timeout: null,

        hide_progress_bar: function() {
            $('#fileupload_progress, #fileupload_progress .ce-fileupload-bar').hide();
            $('.fileupload_placeholder').show();
        },

        show_progress_bar: function() {
//            $('.fileupload_placeholder').hide();
            $('#fileupload_progress, #fileupload_progress .ce-fileupload-bar').show();
        }

    }


$(document).ready(function() {

    $(function() {
        if (window.FastClick) {
            FastClick.attach(document.body);
        }
    });

    window.aui.init();


    if (window.devices.desktop) {
        window.aui.device = "desktop";
    } else if (window.devices.tablet) {
        window.aui.device = "tablet";
    } else if (window.devices.phone) {
        window.aui.device = "phone";
    }


});


 "use strict";

 (function($) {

    //Lines function

    $.fn.lines = function(options) {

        /*
         * Counts the number of lines of text inside the element and returns the number as
         * well as the height in px. Can also limit the number of lines.
         *
         * ARGUMENTS
         * ---------
         *
         * Options:
         *
         * max_lines: number of lines you want to limit the element to.
         *
         * read_more: Displays a link that displays lines hidden by max_lines.
         * Works only in conjunction with max_lines.
        */

        var settings = $.extend({
            max_lines: false,
            read_more: false,
            ellipsis: true,
        }, options);

        var $getLineHeight = $(this).clone().addClass("lines-pseudo").css({
            position: "absolute",
            left: "-3999px",
            height: "auto",
            opacity: 0
        }).html("x<br />x<br />");

        $(this).after($getLineHeight);

        var lineHeight = $getLineHeight.height() / 2,
            height = this.height(),
            lines = height / lineHeight;

        $getLineHeight.remove();
        $(".lines-pseudo").remove();

        if (settings.max_lines && parseInt(settings.max_lines)) {

            if ($(this).css("max-height", "").height() > lineHeight * settings.max_lines) {

                $(this).css({
                    "max-height": lineHeight * settings.max_lines + "px",
                    overflow: "hidden"
                });

                if (!$(this).next().hasClass("lines-dots") && !$(this).next().hasClass("lines-readmore")) {
                    if (settings.read_more) {
                        $(this).after("<a class='lines-readmore' href='#'>Read more</a>");
                    } else if (settings.ellipsis) {
                        $(this).after("<div class='lines-dots'>...</div>");
                    }
                }

                $(this).attr("data-lines", settings.max_lines);

            }
        } else {
            if (settings.max_lines === 0) {
                $(this).css({
                    "max-height": "",
                    overflow: "visible"
                });

                if($(this).next().hasClass("lines-dots") || $(this).next().hasClass("lines-readmore")) {
                    $(this).next().remove();
                }

                $(this).removeAttr("data-lines");
            }

        }

        $(".lines-readmore").click(function(event) {
            event.preventDefault();
            $(this).prev().css({
                "max-height": "",
                overflow: "visible"
            });
            $(this).prev().removeAttr("data-lines");
            $(this).remove();
        });

        var returnObject = {
            px: lineHeight,
            lines: lines
        }

        return returnObject;

    }

    $.fn.upload = function(options) {
        window.aui.fileupload.init($(this), options);
    };

    $.fn.grid_refresh = function(options) {
        return $(this).grid(false, options);
    }

    $.fn.grid_prepend = function(data, options) {

        var id = $(this).find("[data-grid]").data("grid"),
            instance = window.aui.grid.get_grid_instance(id);

        instance.prepend(data, options);
        return $(this);

        //return $(this).grid_add(data, true, template);
    }

    $.fn.grid_append = function(data, options) {
        var id = $(this).find("[data-grid]").data("grid"),
            instance = window.aui.grid.get_grid_instance(id);
        if (instance) {
            instance.append(data, options);
        }
        return $(this);

        //return $(this).grid_add(data, false, template);
    }

    $.fn.grid_get_data = function() {

        var grid_element = $(this).hasClass("aui-grid") ? $(this) : $(this).children(".aui-grid"),
            temp_data = grid_element.data("data");

        if (typeof temp_data === 'object') {
            return temp_data;
        }
        else if (temp_data) {
            return JSON.parse(temp_data);
        }
        else {
            return {};
        }
    }

    $.fn.grid_remove_item = function (item_id) {
        var id = $(this).find("[data-grid]").data("grid"),
            instance = window.aui.grid.get_grid_instance(id);

        instance.remove_item(item_id);
        return $(this);
    }

//    $.fn.grid_add = function(data, prepend, template) {
//        /*
//         * DESCRIPTION
//         * -----------
//         *
//         * Add items to an existing grid.
//         *
//         * In theory this is very easy, but we need to use the same
//         * template as the one used in the existing grid. This is
//         * problematic for grids created with mako, as there is no
//         * existing template. In this case we need to pass one in.
//         *
//         *
//         */
//
//
//        var that = this;
//
//        var grid_element = $(that).children(".aui-grid");
//
//        var grid_id = grid_element.attr("data-grid");
//
//        var existing_grid = window.aui.grid.get_by_uid(grid_id);
//
//        var grid_settings =  existing_grid.settings || {};
//
//        var rows = [];
//
//        var methods = {
//            compress_rows: function() {
//
//                var _grid_set_image_height = window.aui.grid.grid_set_image_height
//                var grid_element = $(that).children(".aui-grid");
//                if (!data) {
//                    data = $(that).find(".aui-grid").grid_get_data();
//                }
//                _grid_set_image_height(grid_element, data);
//
//                // dependencies
////                var _check_row_items = methods.check_row_items;
////
////                var grid_element = $(that).children(".aui-grid");
////
////                $(that).find(".aui-image").css("height", "");
////                window.aui.grid.grid_set_image_height(grid_element);
////                $(".aui-image > img").off("load.grid").on("load.grid", function(event) {
////                    var item_element = $(event.target).closest(".aui-item"),
////                        row = window.aui.grid.item_row_number(grid_element, item_element);
////
////                    if ($(event.target).height() > 60) {
////                        _check_row_items(row, item_element);
////                    }
////                });
//            },
//            check_row_items: function(row, item) {
//                var grid_element = $(that).children(".aui-grid");
//
//                if (!rows[row]) {
//                    rows[row] = 0;
//                }
//                rows[row] ++;
//                if ((rows[row] === window.aui.grid.column_count(grid_element)) || !$(item).next().length) {
//                    window.aui.grid.row_set_image_height(grid_element, row);
//                    rows[row] = 0;
//                }
//            },
//            render_items: function(prepend, template) {
//
//                var _template_data = data;
//                _template_data.options = grid_settings;
////                console.log(grid_element);
////                var existing_html = grid_element.html();
//
//                var html = methods.compile_template(_template_data, template);
//
//                if (prepend) {
//                    grid_element.prepend(html);
//                } else {
//                    var grid_children = grid_element.children(".aui-item");
//                    if (grid_children.length) {
//                        grid_element.children(".aui-item").last().after(html);
//                    } else {
//                        grid_element.prepend(html);
//                    }
//                }
//
//                var grid_data = grid_element.grid_get_data();
//
//                $.each(data.rows, function(k, v) {
//                    grid_data.rows.push(v);
//                });
//
//                grid_element.data("data", grid_data);
//
//                window.aui.lazy_load();
//
//                //methods.blabla();
//                methods.compress_rows();
//
//                // callback after loading grid. Always sends itself as the first argument.
//                if(grid_settings.callback) {
//                    if (typeof grid_settings.callback === 'string') {
//                        // callback may be a string in a json object, in which
//                        // case we need to use eval to conver it to a function
//                        var callback = eval(grid_settings.callback);
//                        var callback_options = grid_settings.callback_options || {};
//                        if (typeof callback_options === 'string') {
//                            callback_options = eval('(' + callback_options + ')');
//                        }
//                        callback($(that), grid_settings.callback_options);
//                    } else {
//
//                        grid_settings.callback($(that), grid_settings.callback_options || {});
//                    }
//                }
//            },
//            compile_template: function(template_data, template) {
//                var html;
//                console.log('xxx', template_data, template, grid_settings.template, grid_settings.item_template);
//                template_data.items_only = true;
//                if (template) {
//                    Handlebars.registerPartial("aui.grid.item", template);
//                    html = window.aui.templates.grid_wrapper(template_data);
//                } else if (grid_settings.item_template) {
//                    var compiled_template = Handlebars.compile(grid_settings.item_template);
//                    html = compiled_template(template_data);
//                } else if (grid_settings.template) {
//
//                    if (window.aui.utils.is_function(grid_settings.item_details_template)) {
//                        Handlebars.registerPartial("aui.grid.item", grid_settings.item_details_template);
//                    } else {
//                        Handlebars.registerPartial("aui.grid.item", $(grid_settings.item_details_template).html());
//                    }
//
//                    if (window.aui.utils.is_function(grid_settings.template)) {
//                        html = grid_settings.template(template_data);
//                    } else {
//                        var source = $(grid_settings.template).html();
//                        var template = Handlebars.compile(source);
//                        html = template(template_data);
//                    }
//                } else {
//                    console.log("no template!");
//                    return false;
//                }
//                console.log('xxx2', template_data);
//                return html;
//            }
//        }
//
////        for (var i = 0; window.aui.grids.length > i; i++) {
////            if (window.aui.grids[i].id === grid_id) {
////                grid_settings = window.aui.grids[i].settings;
////            }
////        }
//
//        methods.render_items(prepend, template);
//
//        return that;
//
//    }

    $.fn.grid_reload = function(data) {

        var grid_element = $(this).hasClass("aui-grid") ? $(this) : $(this).children(".aui-grid"),
            grid_id = grid_element.data("grid"),
            grid_data = grid_element.grid_get_data(),
            grid_instance = window.aui.grid.get_grid_instance(grid_id);
        return $(this).grid(data || grid_data, grid_instance.settings, grid_id);
    }

    window.aui.grids = [];

    window.aui.grid = {
        default_template: '<div class="aui-item"><div class="aui-image-cell"><div class="aui-image"><img src="{{image}}"></div></div><div>{{{content}}}</div>{{#if options.item_menu}}<div class="ce-grid-item-field-cell" data-field-type=""><label class="aui-input-label aui-custom-checkbox"><input type="checkbox" tabindex="1" class="aui-item-select-checkbox"><span class="aui-inner-label"></span></label><button type="button" class="fa fa-angle-down aui-item-menu-btn select-artworks-grid-action-button-caret"></button></div>{{/if}}</div>',
        get_defaults: function() {
            return {
                grid_id: window.aui.utils.generate_uid(),
                grid_class: false,
                columns: false,
                column_spacing: false,
                expanded: false,
                row_spacing: false,
                image_valign: false,
                image_halign: false,
                image_proportion: false,
                image_crop: false,
                image_size: false,
                text_position: false,
                grid_layout: "list",
                max_caption_lines: false,
                responsive: false,
                selectable: false,
                select_multiple: false,
                selectable_key_controls: true,
                callback: window.aui.grid_plugin_load,
                callback_options: false,
                item_template: false, // the plan here is to allow a complete handlebars template as a string....
                template: window.aui.templates.grid_wrapper,
                item_template: this.default_template,
                //item_details_template: this.default_template,//window.aui.templates.partial_grid_details,
                table_heading_template: window.aui.templates.partial_grid_table_heading,
                current_image: 'default'
            }
        },

        get_by_uid: function(id) {
            var _grids = window.aui.grids;

            var grid_count = _grids.length;

            while (grid_count--) {
                if (_grids[grid_count].id === id) {
                    return _grids[grid_count];
                }
            }

            return false;
        },

        item_count: function(grid) {
            return $(grid).children().length;
        },

        column_count: function(grid) {
            //return Math.round($(grid).width() / $(".aui-item", $(grid)).first().outerWidth(true));
            var col = $(".aui-item", $(grid)).first();
            if (col.length) {
                var colwidth = col.outerWidth(true)
                return Math.round($(grid).width() / colwidth);
            } else {
                return 0;
            }
        },

        item_number: function(grid, item) {
            return $(grid).find(".aui-item").index(item) + 1; // we don't want it zero based
        },

        item_row_number: function(grid, item) {
            var columns = window.aui.grid.column_count(grid),
                item_number = window.aui.grid.item_number(grid, item),
                row_number;

            if (item_number < columns) {
                row_number = 1;
            } else {
                row_number = Math.ceil(item_number/columns)
            }

            return row_number;
        },

        row_count: function(grid) {
            var item_count = window.aui.grid.item_count(grid),
                column_count = window.aui.grid.column_count(grid),
                row_count;

            if (item_count < column_count) {
                row_count = 1;
            } else if (column_count) {
                row_count = Math.round(item_count / column_count)
            }

            return row_count;
        },

        row_items: function(grid, row_number) {
            var columns = window.aui.grid.column_count(grid),
                row_item = [],
                row_item_elements = [],
                row_start = columns * (row_number - 1),
                i = 0;

            while (i < columns) {
                row_item[i] = row_start + i;
                row_item_elements[i] = $($(".aui-item", $(grid))[row_item[i]]);
                i++;
            }

            return $(row_item_elements).map (function () {return this.toArray(); } );
        },

        row_height: function(grid, row_number) {

            var columns = window.aui.grid.column_count(grid),
                row_item = [],
                row_item_height = [],
                row_start = columns * (row_number - 1),
                i = 0;

            while (i < columns) {
                row_item[i] = row_start + i;
                row_item_height[i] = $($(".aui-item", $(grid))[row_item[i]]).outerHeight(true);
                i++;
            }

            return Math.max.apply(null, row_item_height);

        },

        row_offset: function(grid, row_number) {
            var row_start = window.aui.grid.column_count(grid) * (row_number - 1),
                row_start_item = $(".aui-grid .aui-item")[row_start];

            return $(row_start_item).offset().top;

        },

        get_image_dimensions: function(src) {
            var img = new Image();

            img.onload = function(){
                var dimensions = {
                    height: img.height,
                    width: img.width
                }
            }

            img.src = src;
        },

        row_image_heights: function(grid, row_number, data) {
            var columns = window.aui.grid.column_count(grid),
                row_item = [],
                row_image_heights = [],
                row_start = columns * (row_number - 1),
                i = 0;

            while (i < columns) {

                row_item[i] = row_start + i;

                if (data) {
                    var item_data = data.rows[row_item[i]] || {},
                        image_dimensions = item_data.image_dimensions;

                    if (!image_dimensions && item_data.main_image_dimensions && window.h) {
                        image_dimensions = window.h.image_urls.parse_dimensions(item_data.main_image_dimensions);
                    } else {
                        //image_dimensions = this.get_image_dimensions($($(".aui-image img", $(grid))[row_item[i]]).attr("src"));
                    }
                    if (image_dimensions) {
                        var width = $($(".aui-image", $(grid))[row_item[i]]).width();
                        var max_height = $($(".aui-image", $(grid))[row_item[i]]).outerHeight();
                        var ratio = width / image_dimensions.width;
                        var height = image_dimensions.height * ratio;

                        row_image_heights[i] = height || max_height * 66 / 100;

                    } else {
                        row_image_heights[i] = $($(".aui-image", $(grid))[row_item[i]]).find("img").outerHeight(true);
                    }
                } else {
                    row_image_heights[i] = $($(".aui-image", $(grid))[row_item[i]]).find("img").outerHeight(true);
                }
                i++;
            }

            return row_image_heights;
        },

        row_max_image_height: function(grid, row_number, data) {
            return Math.max.apply(null, window.aui.grid.row_image_heights(grid, row_number, data));
        },

        row_set_image_height: function(grid, row_number, data) {
            var max_height = aui.grid.row_max_image_height(grid, row_number, data),
                elements = aui.grid.row_items(grid, row_number),
                total_max_height = elements.find(".aui-image").outerHeight();


            // FIXME: just a temp fix for now
            if (isFinite(max_height) && max_height > 10 && !elements.hasClass("img-not-loaded")) {
                elements.find(".aui-image-cell").css("height", max_height > total_max_height ? total_max_height : max_height).addClass('aui-compressed');
                elements.css({
                    //"transition": "opacity 0.5s ease",
                    "opacity": ""
                });
                elements.addClass("row-image-height-set");
                return max_height;
            } else {
//                    var height = total_max_height * 66 /100;
//                    elements.find(".aui-image").css("height", height);
                return "no image";
            }
        },

        row_reset_image_height: function(grid, row_number) {
            var elements = aui.grid.row_items(grid, row_number);

            elements.find(".aui-image").css("height", "");
        },

        grid_set_image_height: function(grid, data) {
            var rows = window.aui.grid.row_count(grid),
                results = [],
                row_result = {},
                row_height;


            for (var i = 1; rows >= i; i++) {
                row_height = window.aui.grid.row_set_image_height(grid, i, data);
                row_result = {};
                row_result[i] = row_height;
                results.push(row_result);
            }

            return results;
        },

        scrollToHash: function(grid) {
            var url_hash = (document.location.hash.split("#")[1]);

            if(url_hash <= window.aui.grid.row_count(grid)) {
                window.scrollTo(0,window.aui.grid.row_offset(grid, url_hash) - 70);
            }

        },

        load_from_html: function(callback) {

            /*
             * Load a grid with the grid plugin using the html data attributes
             *
             * Example:
             *
             * <div data-grid="load" data-grid-options='{"data_url"="/data/grid_data", "columns": 3, "row_spacing": "m"}'></div>
             *
            */

            if ($("[data-grid='load']").length > 0) {
                $("[data-grid='load']").each(function() {
                    var grid_options = $(this).data("grid-options");
                    if (callback) {
                        $.extend(grid_options, {
                            callback: callback
                        });
                    }
                    $(this).grid(grid_options.data_url, grid_options);
                });
            }
        },
        get_settings: function(options) {
            var defaults = window.aui.grid.get_defaults(),
                get_grid_by_id = window.aui.grid.get_by_uid,
                existing_settings = get_grid_by_id(options.grid_id) || {},
                settings = {};

            settings = $.extend(true, defaults, options);

            if (settings.table_columns) {
                var columns_length = settings.table_columns.length,
                    column_heading_exists = false;
                while (columns_length--) {
                    if (settings.table_columns[columns_length].heading) {
                        column_heading_exists = true;
                        break;
                    }
                }

                settings.column_heading_exists = column_heading_exists;
            } else if (settings.table_heading_template) {
                settings.column_heading_exists = true;
            }

            if (!window.aui.grid.current_settings) {
                window.aui.grid.current_settings = {};
            }

            if (settings.responsive) {
                var window_width = window.aui.meta.window_width;
                $.each(settings.responsive, function(key, value) {
                    var width = key.split("-");

                    if (window_width > parseInt(width[0]) && window_width < parseInt(width[1])) {
                        $.extend(settings, value);
                        window.aui.grid.current_settings[settings.id] = key;
                    }

                });
            }

            return settings;
        },
        get_grid_instance: function(id) {
            return window.aui.utils.get_item_by_id(window.aui.grids, id);
        },
        update_grid_instances: function(instance) {
            var existing_instance = this.get_grid_instance(instance.id);

            if (existing_instance) {
                $.extend(true, existing_instance, instance);
            } else {
                window.aui.grids.push(instance);
            }
        }

    };

    window.aui.grd = function(el, data, options) {

        var INSTANCE = this,
            methods;

        INSTANCE.el = el;
        INSTANCE.id = options.grid_id;
        INSTANCE.settings = window.aui.grid.get_settings(options);
        INSTANCE.rows = {};
        INSTANCE.grid_el = INSTANCE.el.children(".aui-grid");
        INSTANCE.data = data || INSTANCE.grid_el.data("data");

        INSTANCE.selected_items = function() {
            var items = [];
            INSTANCE.grid_el.find('.aui-item.selected').each(function() {
                items.push(new methods.Item($(this).data('id')));
            });
            return items;
        }
        //INSTANCE.verbose = true;

        //INSTANCE.settings.compress_rows = false;

        methods = {

            /*
             * Replaces the content of the specified element with a grid.
             *
             * The content of the grid comes from the data argument.
             * The appearance of the grid can be modified with the options.
             *
             *
             * ARGUMENTS
             * ---------
             *
             * Data: Object in the Artlogic Data format or an Array with html.
             *
             *
             * id: unique id of the grid
             *
             *
             * Options:
             *
             * You can pass the id of an existing grid as the options argument
             * to use the settings of an existing grid.
             *
             * columns: number of columns to display in the grid
             *
             * column_spacing: spacing between columns, specified as a size ("xs", "s", "m", "l" or 'xl")
             *
             * row_spacing: spacing between rows, specified as a size ("xs", "s", "m", "l" or "xl")
             *
             * image_valign: vertical image alignment, currently "middle" or "bottom"
             *
             * image_halign: horizontal image alignment, currently "left" or "center"
             *
             * callback: Callback method called after grid is inserted into the element
             *
             * callback_options: Arguments for callback function.
             *
             * template: Id for the template (handlebars) for the grid markup.
             *
             * item_image_template: Id for template (handlebars) for the image.
             *
             * item_details_template: Id for template (handlebars) for the grid item details.
             *
             * current_image: Specify which image url to use from the data.
             *
             * responsive: Specify settings for different screen sizes. example: responsive: {"0-800": {columns: 4, row_spacing: xl, image_size: m}}
             *
             * compress_rows: removes unnecessary space within the image cells
             *
             * caption_overlay: puts the caption on top of the image
             *
            */

            get_template_data: function() {
                var classes = this.get_classes.apply(this);
                return $.extend(true, {}, classes, data);
            },
            settings_classes: ['columns', 'column_spacing', 'row_spacing', 'image_valign', 'image_halign', 'image_proportion', 'image_size', 'text_position', 'text_align', 'text_wrap', 'grid_layout', 'selectable', 'compress_rows', 'expanded', 'clickable', 'cascading', 'caption_overlay', 'caption_overlay_theme'],
            get_classes: function() {
                var _settings = INSTANCE.settings,
                    _settings_list = this.settings_classes,
                    classes_object = {};

                classes_object.options = _settings;

                // settings inside the settings list are passed to the handlebars template as a string with "aui-" prepended
                _settings_list.forEach(function(setting) {
                    if(_settings[setting]) {
                        classes_object[setting] = "aui-" + setting.replace("_", "-") + "-" + _settings[setting];
                    }
                });

                return classes_object;

            },
            set_auto_row_height: function() {;
                var _grid_set_image_height = window.aui.grid.grid_set_image_height;

                //INSTANCE.el.find(".aui-image").css("height", "");
                _grid_set_image_height(INSTANCE.grid_el, INSTANCE.data);
            },
            add_grid_classes: function() {
                var _settings = INSTANCE.settings,
                    _settings_list = this.settings_classes,
                    classes_object = this.get_classes();

                if (_settings.grid_class) {
                    INSTANCE.grid_el.addClass(_settings.grid_class);
                }

                var class_string = "";
                _settings_list.forEach(function(setting) {
                    if (classes_object[setting]) {
                        class_string += " " + classes_object[setting];
                    }
                });

                INSTANCE.grid_el.addClass(class_string);
            },
            set_table_column_widths: function() {
                var _settings = INSTANCE.settings;
                $("[class*='aui-table-column-']", INSTANCE.el).removeClassPrefix("aui-width-").removeClassPrefix("aui-height-");
                if (_settings.table_columns) {
                    for (var i = 0; i < _settings.table_columns.length; i++) {
                        $(".aui-table-column-" + i, INSTANCE.el).addClass("aui-width-" + _settings.table_columns[i].width);
                        $(".aui-table-column-" + i, INSTANCE.el).addClass("aui-height-" + _settings.table_columns[i].height);
                    }
                }
            },
            responsivise_settings: window.aui.utils.debounce(function() {
                var that = this,
                    responsive_settings_used = false,
                    window_width = window.aui.meta.window_width;

                if (INSTANCE.settings.responsive) {
                    // loop through responsive settings
                    $.each(INSTANCE.settings.responsive, function(key, value) {
                        var width = key.split("-");

                        // check if the window width matches the width for the responsive settings
                        if (window_width > parseInt(width[0]) && window_width < parseInt(width[1])) {
                            // responsive settings are being used
                            responsive_settings_used = true;
                            if (window.aui.grid.current_settings[INSTANCE.id] !== key) {
                                // refresh grid with all options
                                // (when refreshed it will know to use the responsive settings)
                                //INSTANCE.el.grid(false, options);
                                that.refresh(options);
                                window.aui.grid.current_settings[INSTANCE.id] = key;
                            }
                        } else {
                            if (window.aui.grid.current_settings[INSTANCE.id]) {
                                //INSTANCE.el.grid(false, options);
                                that.refresh(options);
                                window.aui.grid.current_settings[INSTANCE.id] = undefined;
                            }
                        }
                    });
                }

                // if no responsive settings are being used then
                // we need to revert to the default settings (refresh grid)
                if (!responsive_settings_used) {
                    INSTANCE.settings = window.aui.grid.get_settings(options); //options;
                    this.refresh();
                }

            }, 50),
            replace_images: function() {
                /*
                 * This method is for image 'template urls' as used in
                 * Artlogic Database, like this:
                 * https://static-assets.artlogic.net/[size]/artlogicstorage/[site]images/view/%(filename)s
                 *
                 * settings.image_settings is for cloudinary crop settings and will replace the '[size]'
                 * settings.site or aui.settings.site will replace '[site]'
                 */
                var _settings = INSTANCE.settings,
                    image_template,
                    image_url,
                    image_uid;

                INSTANCE.el.find("[data-image-id]").each(function() {
                    if (_settings.image_settings_preset) {
                        if (window.h.image_urls[_settings.image_settings_preset]) {
                            image_uid = $(this).data("image-id");
                            if (image_uid) {
                                image_url = window.h.image_urls[_settings.image_settings_preset](image_uid);
                                if (image_url !== $(this).attr("src")) {
                                    $(this).closest('.aui-item').removeClass('img-loaded');
                                    $(this).attr("data-img-src", image_url);
                                }
                            }
                        }
                    }
                });
            },

            get_compiled_template: function(template) {
                var _settings = INSTANCE.settings,
                    _is_function = window.aui.utils.is_function,
                    compiled_template;

                // template could be a compiled template, a DOM element or a string
                if (_is_function(template)) {
                    compiled_template = template;
                } else if (window.aui.compiled_templates[template.replace("#", "")]) {
                    compiled_template = window.aui.compiled_templates[template.replace("#", "")];
                } else if (template && template.indexOf('<') < 0) {
                    compiled_template = Handlebars.compile($(template).html());
                } else if (template && template.indexOf('<script') > -1) {
                    compiled_template = Handlebars.compile($(template).html());
                } else if (template) {
                    compiled_template = Handlebars.compile(template);
                }

                return compiled_template;
            },
            set_compiled_templates: function() {
                var _settings = INSTANCE.settings;

                INSTANCE.compiled_templates = {};
                
                // item template
                INSTANCE.compiled_templates.item = this.get_compiled_template(_settings.item_details_template || _settings.item_template);
                
                Handlebars.registerPartial('aui.grid.item', INSTANCE.compiled_templates.item);

                // table heading template
                if (_settings.column_heading_exists) {
                    INSTANCE.compiled_templates.table_heading = this.get_compiled_template(_settings.table_heading_template);
                    Handlebars.registerPartial('aui.grid.heading', INSTANCE.compiled_templates.table_heading);
                }

                // grid wrapper
                INSTANCE.compiled_templates.list = this.get_compiled_template(_settings.template);
            },
            get_html: function(data) {
                
                var _settings = INSTANCE.settings,
                    _template_data = data || this.get_template_data(),
                    html = "";

                html = INSTANCE.compiled_templates.list(_template_data);

                return html;
            },
            render: function() {

                this.set_compiled_templates();
                var html = this.get_html();

                if (INSTANCE.el.length) {
                    INSTANCE.el[0].innerHTML = html;
                } else {
                    console.log("element passed to grid method doesn't exist");
                    return;
                }

                this.on_load.apply(this);
            },
            refresh: function(options) {
                //$.extend(existing_grid, INSTANCE);
                if (options) {
                    INSTANCE.settings = window.aui.grid.get_settings(options); //options;
                }

                // remove all classes except 'aui-grid'...
                INSTANCE.grid_el.attr("class", "aui-grid");

                // ...then add classes from settings
                this.add_grid_classes();
                this.set_table_column_widths();
                this.replace_images();

                // reset row heights
                INSTANCE.el.find(".aui-image-cell").css("height", "").removeClass("aui-compressed");

                // reset lazy painting
                if (!INSTANCE.settings.lazy_paint || INSTANCE.settings.expanded) {
                    INSTANCE.el.find(".aui-item").removeClass("lazy-paint");
                    $(window.aui.scroll_element).off('scroll.lazy_paint');
                    $(window).off('resize.lazy_paint');
                }

                this.on_load();
            },
            add_item: function(data, position, options) {
                data.items_only = true;
                data.options = INSTANCE.settings;
                var html = this.get_html(data);
                delete data.items_only;
                if (position == "append") {
                    INSTANCE.grid_el.append(html);
                    // add new data to current data
                    INSTANCE.data.rows.push.apply(INSTANCE.data.rows, data.rows);
                    INSTANCE.grid_el.data("data", INSTANCE.data);
                } else {
                    INSTANCE.grid_el.prepend(html);
                    // add new data to current data
                    INSTANCE.data.rows.unshift.apply(INSTANCE.data.rows, data.rows);
                    INSTANCE.grid_el.data("data", INSTANCE.data);
                }

                this.on_load.apply(this, [options]);
            },
            remove_item: function (id) {
                var item = new this.Item(id);
                item.remove();
            },
            add_event_listeners: function() {
                var that = this;

                INSTANCE.el.find(".aui-image > img").each(function() {
                    var img = new Image(),
                        img_src = $(this).attr("data-img-src"),
                        item_element = $(this).closest(".aui-item");

                    img.onload = function () {
                        item_element.removeClass("img-not-loaded").addClass("img-loaded");
                    }
                    $(this).off('aui_lazy_load.mod_classes').on('aui_lazy_load.mod_classes', function() {
                        img.src = img_src;
                    });

                });

                // show items on img load
//                INSTANCE.el.find(".aui-image > img").off("load.item_img").on("load.item_img", function(event) {
//                    var item_element = $(event.target).closest(".aui-item");
//                    // FIXME: this is relying on the img height to know if img has loaded.. dangerous
//                    if ($(event.target).height() > 60) {
//                        item_element.removeClass("img-not-loaded").addClass("img-loaded");
//                        //window.aui.grid.grid_set_image_height(INSTANCE.el, INSTANCE.data);
//                    }
//                });

                // check if responsive settings should be used on resize
                $(window).off("resize.aui_grid"+INSTANCE.id).on("resize.aui_grid"+INSTANCE.id, function() {
                    that.responsivise_settings();
                });
            },
            on_load: function(options) {

                var that = this,
                    _settings = INSTANCE.settings,
                    //_settings_list = this.settings_classes,
                    _compress_rows = this.compress_rows,
                    _lazy_load = window.aui.lazy_load,
                    _set_auto_row_height = this.set_auto_row_height,
                    _is_function = window.aui.utils.is_function
                    options = options || {};

                // add event listeners
                this.add_event_listeners();

                // add class for images that haven't loaded
                INSTANCE.el.find(".aui-image > img").closest(".aui-item:not(.img-loaded)").addClass("img-not-loaded");

                // grid element has been rendered, now set INSTANCE.grid_el
                INSTANCE.grid_el = INSTANCE.el.children(".aui-grid");

                // mark element as grid and add data
                INSTANCE.grid_el.attr("data-grid", INSTANCE.id).attr("data-data", INSTANCE.data ? JSON.stringify(INSTANCE.data) : '');

                window.aui.grid.update_grid_instances(INSTANCE);

                // lazy load images
                _lazy_load(false, INSTANCE.el, true);

                // set height to compress rows
                if (_settings.compress_rows) {
                    _set_auto_row_height();
                    //_compress_rows.apply(this);
                } else {
                    INSTANCE.el.find(".aui-image > img").off("load.grid");
                }

                // initialise selectables
                if (_settings.selectable) {
                    var selectable = window.aui.selectable.create(INSTANCE.id, {
                        filter: '.aui-item:not(.aui-table-header-row)',
                        unselect_on_click: false
                    });
                    selectable.reset();
                    selectable.add();
                    that.selectable = selectable;
                }

                // LAZY PAINT LIST ITEMS
                // (performance improvement, most notably for preview pane animation)
                var lazy_paint_containers = INSTANCE.el.find(".aui-grid");


                if (_settings.lazy_paint && !_settings.expanded) {
                    $(window.aui.scroll_element).off('scroll.lazy_paint').on('scroll.lazy_paint', function() {
                        lazy_paint();
                    });
                    $(window).off('resize.lazy_paint').on('resize.lazy_paint', function() {
                        lazy_paint();
                    });

                    lazy_paint();

                }

                function lazy_paint() {
                    var top_offset_to_load = window.aui.meta.window_height,
                        lazy_paint_elements = INSTANCE.el.find(".aui-item");

                    for (var i = 0; lazy_paint_elements.length > i; i++) {
                        var el = $(lazy_paint_elements[i]),
                            el_top = el.offset().top;
                        if (el_top <= top_offset_to_load && el_top > 0) {
                            el.removeClass("lazy-paint");
                        } else {
                            el.addClass("lazy-paint");
                        }
                    }
                }


                // sortable
                if (_settings.sortable) {
                    var sort_changed = false,
                        original_item_width = INSTANCE.el.find(".aui-grid .aui-item").width(),
                        original_index;
                    INSTANCE.el.find(".aui-grid").sortable({
                        delay: 150,
                        revert: 0,
                        helper: function (e, item) {
                            var helper = $('<div class=""></div>');
                            var elements = item.parent().children('.selected').clone();
                            if (elements.length && item.hasClass('selected')) {
                                elements.addClass('ui-sortable-helper');
                                var s = item.data('multidrag', elements).siblings('.selected');
                                s.each(function(key, item) {
                                    /* hide the elements instead of deleting them to fix
                                    a strange jQuery sortable bug. Then delete them later. */
                                    $(item).addClass('hidden-sortable').css("display", "none");
                                });
                                return helper.append(elements);
                            } else {
                                return item.clone();
                            }
                        },
                        start: function(e, ui) {
                            INSTANCE.grid_el.addClass('is-dragging');
                            // playing with the markup/css to avoid glitches in the grid
                            ui.item.css({
                                display: '',
                                opacity: '0'
                            });

                            original_index = ui.item.index();

                            ui.placeholder.appendTo(INSTANCE.grid_el);
                            //ui.placeholder.css('width', original_item_width);
                            //ui.placeholder.find('.aui-image').css('width', ui.item.find('.aui-image img').width());
                        },
                        change: function(e, ui) {
                            // playing with the markup/css to avoid glitches in the grid
                            ui.item.appendTo(INSTANCE.grid_el);
                            sort_changed = true;
                        },
                        stop: function (e, ui) {
                            // playing with the markup/css to avoid glitches in the grid
                            if (!sort_changed) {
                                ui.item.insertBefore(INSTANCE.grid_el.find('.aui-item').eq(original_index));
                            }

                            sort_changed = false;

                            if (ui.item.hasClass("selected")) {
                                ui.item.after(ui.item.data('multidrag').removeClass('ui-sortable-helper')).remove();
                            }
                            INSTANCE.grid_el.removeClass('is-dragging');
                            ui.item.css({
                                opacity: ''
                            });
                            $('.hidden-sortable').remove();
                        },
                        update: function(e, info) {
                            // looks like this event is called
                            // before the dom is ready (which is not what's said in the api documentation)
                            window.setTimeout(function() {
                                if (_settings.on_sortable_update) {
                                    _settings.on_sortable_update(INSTANCE);
                                }
                            }, 80);
                        }
                    });
                }

                this.event_handlers();

                // callback after loading grid. Always sends itself as the first argument.

                if (typeof _settings.callback === 'string') {
                    // callback may be a string in a json object, in which
                    // case we need to use eval to conver it to a function
                    var callback = eval(_settings.callback);
                    var callback_options = _settings.callback_options || {};
                    if (typeof callback_options === 'string') {
                        callback_options = eval('(' + callback_options + ')');
                    }
                    if (_is_function(callback)) {
                        callback(INSTANCE.el, _settings.callback_options);
                    }
                } else if (_is_function(_settings.callback)) {
                    _settings.callback(INSTANCE.el, _settings.callback_options || {});
                }

                if (window.aui.utils.is_function(options.callback)) {
                    options.callback();
                }

                // FIX IE8 (:nth-child css not supported)
                if (window.aui.meta.ie == 8) {
                    INSTANCE.grid_el.find(".aui-first-in-row, .aui-last-in-row").removeClass("aui-first-in-row aui-last-in-row");
                    INSTANCE.grid_el.find(".aui-item:nth-child("+_settings.columns+"n+"+1+")").addClass("aui-first-in-row");
                    INSTANCE.grid_el.find(".aui-item:nth-child("+_settings.columns+"n+"+_settings.columns+")").addClass("aui-last-in-row");
                }

            },
            /* The following methods are for compressing row height if no image_dimensions available */
            compress_rows: function() {
                // dependencies
                var _set_row_height = this.set_row_height,
                    _grid_set_image_height = window.aui.grid.grid_set_image_height,
                    _item_row_number = window.aui.grid.item_row_number;

                INSTANCE.el.find(".aui-image").css("height", "");
                _grid_set_image_height(INSTANCE.grid_el);

                $(".aui-image > img").off("load.grid").on("load.grid", function(event) {
                    var item_element = $(event.target).closest(".aui-item"),
                        row = _item_row_number(INSTANCE.grid_el, item_element);

                    if ($(event.target).height() > 60) {
                        _set_row_height(row, item_element);
                    }
                });
            },
            set_row_height: function(row, item) {
                var _column_count = window.aui.grid.column_count,
                    _set_row_image_height = window.aui.grid.row_set_image_height,
                    rows = INSTANCE.rows,
                    column_count = _column_count(INSTANCE.grid_el);

                if (!rows[row]) {
                    rows[row] = 0;
                }
                rows[row] ++;
                if ((rows[row] === column_count) || !$(item).next().length) {
                    _set_row_image_height(INSTANCE.grid_el, row);
                    rows[row] = 0;
                }
            },
            Item: (function () {
                function Item (id) {
                    this.id = id;
                }

                Item.prototype = {
                    get_index: function () {
                        return this.get_element().index();
                    },
                    get_element: function () {
                        return INSTANCE.grid_el.find('.aui-item[data-id="' + this.id + '"]')
                    },
                    selected: function () {
                        return this.get_element().hasClass("selected");
                    },
                    remove: function () {
                        var that = this,
                            element = this.get_element();

                        element.remove();
                        if (INSTANCE.data) {
                            var filtered_rows = INSTANCE.data.rows.filter(function(item) {
                                return item.id != that.id;
                            });
                            INSTANCE.data.rows = filtered_rows;
                            INSTANCE.grid_el.data('data', JSON.stringify(INSTANCE.data));
                        }
                    }
                }

                return Item;
            }()),
            move_items: function(index, items_to_move, position) {
                index = index < 0 ? 0 : index;
                var elements_to_move,
                    item_to_move_to = INSTANCE.grid_el.find(".aui-item").eq(index),
                    insert_method = position == "before" ? "insertBefore" : "insertAfter";

                items_to_move.reverse();
                items_to_move.forEach(function(i) {
                    if (!elements_to_move) {
                        elements_to_move = INSTANCE.grid_el.find(".aui-item").eq(i);
                    } else {
                        elements_to_move = elements_to_move.add(INSTANCE.grid_el.find(".aui-item").eq(i));
                    }
                });
                //console.log(elements_to_move, item_to_move_to)
                elements_to_move[insert_method](item_to_move_to);

            },
            move_selected_items: function(index, position) {
                var selected_items = INSTANCE.selected_items(),
                    selected_item_indices = [];

                selected_items.forEach(function(item) {
                    selected_item_indices.push(item.get_index());
                });

                this.move_items(index, selected_item_indices, position);
            },
            event_handlers: function () {
                INSTANCE.grid_el.off('click.aui.grid.item.select').on('click.aui.grid.item.select', ".aui-item", function(event) {
                    let is_event_item_details = $(event.target).parents('#event-item-artwork-details').length > 0;
                    if (!$(event.target).is('.aui-custom-checkbox, button, input, textarea, a, i') && !is_event_item_details) {
                        $(this).find(".aui-item-select-checkbox").trigger('click');
                    }
                });
                INSTANCE.grid_el.off('change.aui.grid.item.select_checkbox').on('change.aui.grid.item.select_checkbox', ".aui-item-select-checkbox", function() {
                    var item = $(this).closest('.aui-item'),
                        selected = $(this).is(":checked"),
                        any_selected;

                    item.toggleClass('selected', selected);

                    any_selected = !!INSTANCE.grid_el.find('.aui-item.selected').length;
                    INSTANCE.grid_el.toggleClass('an-item-is-selected', any_selected);
                });
                this.item_menu_handler();
            },
            item_menu_handler: function () {
                var that = this,
                    menu = INSTANCE.settings.item_menu;

                if (menu == 'standard') {
                    menu = {
                        width: '200px',
                        selector: '.aui-item-menu-btn',
                        buttons: [
                            {
                                label: 'Move selected items above',
                                onclick: function (event, button, item, grid) {
                                    grid.move_selected_items(item.get_index(), 'before');
                                },
                                show: function (item, grid) {
                                    return grid.selected_items().length && !item.selected();
                                }
                            },
                            {
                                label: 'Move selected items below',
                                onclick: function (event, button, item, grid) {
                                    grid.move_selected_items(item.get_index(), 'after');
                                },
                                show: function (item, grid) {
                                    return grid.selected_items().length && !item.selected();
                                }
                            },
                            {
                                label: 'Move item up',
                                onclick: function (event, button, item, grid) {
                                    grid.move_items(item.get_index()-1, [item.get_index()], 'before');
                                },
                                show: function (item, grid) {
                                    return !grid.selected_items().length || item.selected();
                                }
                            },
                            {
                                label: 'Move item down',
                                onclick: function (event, button, item, grid) {
                                    grid.move_items(item.get_index()+1, [item.get_index()], 'after');
                                },
                                show: function (item, grid) {
                                    return !grid.selected_items().length || item.selected();
                                }
                            },
                            {
                                label: 'Remove selected items',
                                onclick: function (event, button, item, grid) {
                                    grid.selected_items().forEach(function(selected_item) {
                                        selected_item.remove();
                                    });
                                },
                                disable: function (item, grid) {
                                    return !grid.selected_items().length || !item.selected();
                                }
                            }
                        ]
                    }
                }

                if (menu) {
                    INSTANCE.grid_el.off('click.aui.grid.item.menu').on('click.aui.grid.item.menu', menu.selector, function() {
                        var item_element = $(this).closest('.aui-item'),
                            item = new that.Item(item_element.data('id')),
                            template = '<ul class="stickybox-menu">{{#each buttons}}{{#if show}}<li><button id="aui-grid-item-menu-btn-{{id}}" class="{{css_class}}" {{#if disable}}disabled{{/if}}>{{label}}</button></li>{{/if}}{{/each}}</ul>',
                            template_data = {buttons: []};

                        menu.buttons.forEach(function(button) {
                            template_data.buttons.push($.extend({id: window.aui.utils.get_uid(), close_on_click: true}, button, {
                                disable: button.disable ? button.disable(item, INSTANCE) : false,
                                show: button.show ? button.show(item, INSTANCE) : true
                            }));
                        });

                        $(this).stickyBox(Handlebars.compile(template)(template_data), {
                            width: menu.width || '200px',
                            on_load: function(stickybox_clicked_element, stickybox_element, close) {
                                template_data.buttons.forEach(function(button) {
                                    stickybox_element.find('#aui-grid-item-menu-btn-'+button.id)
                                        .off('click.aui.grid.item.menu.btn')
                                        .on('click.aui.grid.item.menu.btn', function(event) {
                                            button.onclick(event, $(this), item, INSTANCE);
                                            if (button.close_on_click) {
                                                close();
                                            }
                                        });
                                });
                            }
                        });
                    });
                }
            }
        }

        INSTANCE.append = function(data, options) {
            methods.add_item(data, 'append', options);
        }
        INSTANCE.prepend = function(data, options) {
            methods.add_item(data, 'prepend', options);
        }
        INSTANCE.move_items = function() {
            methods.move_items.apply(methods, arguments);
        }
        INSTANCE.move_selected_items = function() {
            methods.move_selected_items.apply(methods, arguments);
        }
        INSTANCE.remove_item = function (id) {
            methods.remove_item(id);
        }

        return methods;
    };

    $.fn.grid = function(data, options, id) {
        options.grid_id = id;
        var grid = new window.aui.grd($(this), data, options);
        
        if (data) {
            if (data.rows &&
                window.edit &&
                window.edit[window.page_settings.tablename] &&
                window.edit[window.page_settings.tablename].images &&
                window.edit[window.page_settings.tablename].images.current_grid_data &&
                window.edit[window.page_settings.tablename].images.apply_grid_state && 
                typeof window.edit[window.page_settings.tablename].images.apply_grid_state === 'function') {
                    window.edit[window.page_settings.tablename].images.apply_grid_state(data);
            }
            grid.render(data);
        } else {
            // no content available - check if the element is already a grid and if so apply classes according to options
            grid.refresh();
        }
        this.selectable = grid.selectable;
        return this;
    }

    $.fn.list_table = function(data, options, id) {

        var s = '';//'<script id="aui_grid_wrapper" type="text/x-handlebars-template">';
        s += '<div class="aui-grid aol-records aui-grid-layout-table {{options.grid_class}} {{columns}} {{column_spacing}} {{row_spacing}} {{image_halign}} {{image_valign}} {{image_size}} {{text_position}} {{text_align}} {{text_wrap}} {{grid_layout}} {{image_proportion}}" {{#if options.selectable}}data-selectable-group="{{options.grid_id}}" data-selectable-key-controls="{{options.selectable_key_controls}}"  data-selectable-activate-keycode="40" data-selectable-multi="{{options.select_multiple}}"{{/if}}>';
            s += '{{#smart_if options.table_columns "&&" options.column_heading_exists}}';
                s += '<div class="aui-item aui-table-header-row">';
                    s += '{{#each options.table_columns}}';
                        s += '<div class="{{column_classes ../options.table_columns @index}}">{{{heading}}}</div>';
                    s += '{{/each}}';
                s += '</div>';
            s += '{{/smart_if}}';
            s += '{{#each rows}}<div class="aui-item {{list_item_classes this}}" {{#if ../options.flag}}data-flaggable="{{../options.grid_id}}"{{/if}} {{#if id}}data-id="{{id}}"{{else}}{{#if __id__}}data-id="{{__id__}}"{{/if}}{{/if}} data-index="{{get_index @index ../index_offset}}">';
                s += '{{#each ../keys}}';
                    s += '<div class="{{column_classes ../../options.table_columns @index}}" title="{{get_obj_prop_text ../this this}}">';
                    s += '{{{lookup ../this this}}}';
                    s += '</div>';
                s += '{{/each}}';
            s += '</div>{{/each}}';
        s += '</div>';
        //s += '</script>';

        options = $.extend({
            template: s,
            name: 'default',
            view_label: 'Default',
            //columns: 1,
            row_spacing: "none",
            grid_layout: 'table'
        }, options);

        $(this).grid(data, options, id);
    },

    $.fn.stickyBox = function(content, options) {
        if (content) {
            if (typeof options === "object") {
                options.content = content;
            } else {
                options = {
                    content: content
                }
            }
        }
        if (!$(this).attr("data-sticky-element")) {
            window.aui.stickybox.load($(this), options);
        } else {
            window.aui.stickybox.close();
        }
        return this;

        /*
         * Opens a box that sticks to the cursor or the element you specify.
         *
         * The box will close whenever a mousedown event occurs outside of the box.
         *
         * NOTE: Currently the box position will get messed up if the container element changes it's height.
         *
         * TODO: Make auto_edge_dodge work on browser resize.
         *
         * ARGUMENTS
         * ---------
         *
         * Content: HTML content as a string.
         *
         * Options:
         *
         * stick_to: "element" or "cursor" - the box sticks to
         * the middle of the element or to the cursor
         *
         * halign: "left", "right" or "center". The horizontal
         * alignment of the box relative to the cursor or the
         * center of the element
         *
         * valign: "top" or "bottom". Vertical alignment of the box.
         *
         * element_halign: "left", "right" or "center". The horizontal
         * position of the stickybox in relation to the element it sticks to.
         *
         * auto_edge_dodge: true or false. Make the stickybox change it's position
         * if it goes out of view of the browser window.
         *
         * width: Width of the box (applied as inline style) as a string with unit (e.g "300px")
         *
         * height: Height of the box (applied as inline style) as a string with unit (e.g "300px")
         *
         * show_arrow: option to show or hide the arrow that points from stickybox to the element
         *
         * toggle: if true close stickybox when loading on the same element
         *
         * on_close: Callback function for when box closes
         *
         * on_load: Callback method for when box opens
         *
         * close_button: jQuery selector for a button to close the box.
        */

    };
    
    $.fn.stickyBoxMenu = function (menu_items, options) {
        options.menu_items = menu_items;
        if (!$(this).attr("data-sticky-element")) {
            window.aui.stickybox_menu.load($(this), options);
        } else {
            window.aui.stickybox_menu.close();
        }
        return this;
    };
    

    $.fn.contextMenu = function(content, options) {

        /*
         * Right click context menu is replaced by stickyBox with custom content/settings.
         *
         * Settings are the same as in the stickyBox plugin.
        */

        var settings = $.extend({
            stick_to: "cursor",
            halign: "left",
            valign: "bottom",
            width: 180,
            show_arrow: false,
            on_close: null,
            on_load: null
        }, options);

        var element = $(this);

        var context_menu = function(e) {

            var obj = $(e.target);
            var inside_obj = obj.closest(element);

            if (inside_obj.length && !e.shiftKey == 1) {
                e.preventDefault();

                $(element).stickyBox(content, settings);
            }
        };

        if (document.addEventListener) {
            document.addEventListener('contextmenu', function(e) {
                //alert("You've tried to open context menu"); //here you draw your own menu
                return context_menu(e);
            }, false);
        } else {
            document.attachEvent('oncontextmenu', function() {
                //alert("You've tried to open context menu");
                window.event.returnValue = false;
                return context_menu(window.event);
            });
        }

        return this;

    };


    //Read more function (currently not functional / to be merged with the lines plugin)

    $.fn.readMore = function(options) {

        this.css("height", "");
        $(".event-read-more").remove();

        var settings = $.extend({
            maxLines: 4,
            toggleSpeed: 200,
            linkText: {
                read_more: "Read more",
                read_less: "Read less"
            },
            textClickable: false
        }, options);

        $getLineHeight = $(this).clone().css({
            position: "absolute",
            left: "-9999px",
            opacity: 0
        }).html("x<br />x<br />");

        $(this).after($getLineHeight);



        if(lines > settings.maxLines) {
            this.css({
                height: lineHeight * settings.maxLines,
                overflow: "hidden"
            }).data("readmore-open", false).after("<a href='#' class='event-read-more'>" + settings.linkText.read_more + "</a>");

            if(settings.textClickable) {
                var trigger = $(this).add(this.parent().children(".event-read-more"));
                this.css({cursor: "pointer"});
            }else {
                var trigger = this.parent().children(".event-read-more");
            }

            trigger.on("click", function(event) {
                event.preventDefault();

                if(!$(this).hasClass("event-read-more")) {
                    thisElement = $(this);
                    thisLink = $(this).next(".event-read-more");
                }else {
                    thisElement = $(this).prev();
                    thisLink = $(this);
                }

                var open = thisElement.data("readmore-open");

                if(open) {

                    thisElement.animate({
                        height: lineHeight * settings.maxLines
                    }, settings.toggleSpeed);

                    thisLink.text(settings.linkText.read_more);

                    thisElement.data("readmore-open", false);

                }else {

                    thisElement.animate({
                        height: height
                    }, settings.toggleSpeed);

                    if(settings.linkText.read_less !== false) {
                        thisLink.text(settings.linkText.read_less);
                    } else {
                        thisLink.text("");
                    }

                    thisElement.data("readmore-open", true);

                }

            });
        }

        return this;

    };



    // taken from here http://stackoverflow.com/questions/12243898/how-to-select-all-text-in-contenteditable-div
    $.fn.selectText = function(){
        var doc = document;
        var element = this[0];

        if (doc.body.createTextRange) {
            var range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        } else if (window.getSelection) {
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        return this;
    };


    $.fn.removeClassPrefix = function(prefix) {
        this.each(function(i, el) {
            var classes = el.className.split(" ").filter(function(c) {
                return c.lastIndexOf(prefix, 0) !== 0;
            });
            el.className = $.trim(classes.join(" "));
        });
        return this;
    };





 }(jQuery));

this["aui"] = this["aui"] || {};
this["aui"]["templates"] = this["aui"]["templates"] || {};

Handlebars.registerPartial("partial_grid_details", this["aui"]["templates"]["partial_grid_details"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.heading : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper;

  return "        <div class=\"aui-caption_header\"><h3>"
    + ((stack1 = ((helper = (helper = helpers.heading || (depth0 != null ? depth0.heading : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"heading","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</h3></div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.content : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, helper;

  return "        <div class=\"aui-caption\">"
    + ((stack1 = ((helper = (helper = helpers.content || (depth0 != null ? depth0.content : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"content","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</div>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.price : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"8":function(container,depth0,helpers,partials,data) {
    var stack1, helper;

  return "        <div class=\"aui-price\">"
    + ((stack1 = ((helper = (helper = helpers.price || (depth0 != null ? depth0.price : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"price","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</div>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.availability : depth0),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"11":function(container,depth0,helpers,partials,data) {
    var helper;

  return "        <div class=\"aui-availability aui-availability-"
    + container.escapeExpression(((helper = (helper = helpers.availability || (depth0 != null ? depth0.availability : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"availability","hash":{},"data":data}) : helper)))
    + "\"></div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers.unless.call(alias1,(depths[1] != null ? depths[1].hide_heading : depths[1]),{"name":"unless","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(alias1,(depths[1] != null ? depths[1].hide_content : depths[1]),{"name":"unless","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depths[1] != null ? depths[1].show_prices : depths[1]),{"name":"if","hash":{},"fn":container.program(7, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.hide_availability : depth0),{"name":"unless","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"useData":true,"useDepths":true}));

Handlebars.registerPartial("partial_grid_images", this["aui"]["templates"]["partial_grid_images"] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"aui-image-cell\">\n    <div class=\"aui-image-container\">\n        <div>\n            <div class=\"aui-image\">\n                "
    + ((stack1 = (helpers.get_image_element || (depth0 && depth0.get_image_element) || helpers.helperMissing).call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.images : depth0),((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.current_image : stack1),{"name":"get_image_element","hash":{},"data":data})) != null ? stack1 : "")
    + "\n            </div>\n        </div>\n    </div>\n</div>";
},"useData":true}));

Handlebars.registerPartial("partial_grid_table_heading", this["aui"]["templates"]["partial_grid_table_heading"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <div class=\"aui-table-column-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + " aui-width-"
    + alias4(((helper = (helper = helpers.width || (depth0 != null ? depth0.width : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"width","hash":{},"data":data}) : helper)))
    + "\">"
    + ((stack1 = ((helper = (helper = helpers.heading || (depth0 != null ? depth0.heading : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"heading","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.table_options : stack1)) != null ? stack1.columns : stack1),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"useData":true}));

this["aui"]["templates"]["grid_wrapper"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=container.escapeExpression, alias2=depth0 != null ? depth0 : {}, alias3=helpers.helperMissing, alias4="function";

  return "<ul class=\"aui-grid "
    + alias1(container.lambda(((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.grid_class : stack1), depth0))
    + " "
    + alias1(((helper = (helper = helpers.columns || (depth0 != null ? depth0.columns : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"columns","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.column_spacing || (depth0 != null ? depth0.column_spacing : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"column_spacing","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.row_spacing || (depth0 != null ? depth0.row_spacing : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"row_spacing","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.image_halign || (depth0 != null ? depth0.image_halign : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"image_halign","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.image_valign || (depth0 != null ? depth0.image_valign : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"image_valign","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.image_size || (depth0 != null ? depth0.image_size : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"image_size","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.text_position || (depth0 != null ? depth0.text_position : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"text_position","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.text_align || (depth0 != null ? depth0.text_align : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"text_align","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.text_wrap || (depth0 != null ? depth0.text_wrap : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"text_wrap","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.grid_layout || (depth0 != null ? depth0.grid_layout : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"grid_layout","hash":{},"data":data}) : helper)))
    + " "
    + alias1(((helper = (helper = helpers.image_proportion || (depth0 != null ? depth0.image_proportion : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"image_proportion","hash":{},"data":data}) : helper)))
    + "\" "
    + ((stack1 = helpers["if"].call(alias2,((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.selectable : stack1),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "data-selectable-group=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.grid_id : stack1), depth0))
    + "\" data-selectable-key-controls=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.selectable_key_controls : stack1), depth0))
    + "\"  data-selectable-activate-keycode=\"40\" data-selectable-multi=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.select_multiple : stack1), depth0))
    + "\"";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.column_heading_exists : stack1),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "            <li class=\"aui-item aui-table-header-row\">\n"
    + ((stack1 = container.invokePartial(partials.heading_partial,depth0,{"name":"heading_partial","hash":{"options":(depth0 != null ? depth0.options : depth0)},"data":data,"indent":"                ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "            </li>\n";
},"7":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "        <li class=\"aui-item\" "
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depths[1] != null ? depths[1].options : depths[1])) != null ? stack1.flag : stack1),{"name":"if","hash":{},"fn":container.program(8, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.id : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " data-index=\""
    + container.escapeExpression((helpers.get_index || (depth0 && depth0.get_index) || helpers.helperMissing).call(alias1,(data && data.index),(depths[1] != null ? depths[1].index_offset : depths[1]),{"name":"get_index","hash":{},"data":data}))
    + "\">\n"
    + ((stack1 = container.invokePartial(partials['aui.grid.item'],depth0,{"name":"aui.grid.item","hash":{"options":(depths[1] != null ? depths[1].options : depths[1])},"data":data,"indent":"            ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "        </li>\n";
},"8":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "data-flaggable=\""
    + container.escapeExpression(container.lambda(((stack1 = (depths[1] != null ? depths[1].options : depths[1])) != null ? stack1.grid_id : stack1), depth0))
    + "\"";
},"10":function(container,depth0,helpers,partials,data) {
    var helper;

  return "data-id=\""
    + container.escapeExpression(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"id","hash":{},"data":data}) : helper)))
    + "\"";
},"12":function(container,depth0,helpers,partials,data) {
    return "</ul>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.items_only : depth0),{"name":"unless","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.options : depth0)) != null ? stack1.table_options : stack1),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.rows : depth0),{"name":"each","hash":{},"fn":container.program(7, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.items_only : depth0),{"name":"unless","hash":{},"fn":container.program(12, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"usePartial":true,"useData":true,"useDepths":true});

this["aui"]["templates"]["aui_slide_partial"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "        <button class=\"aui-slide-skip-previous\"><i class=\"aui-icon-arrow-left-double-bold\"></i>Skip</button>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper;

  return "             <span contenteditable=\"true\" class=\"aui-slide-number-field\" data-slide-listener=\""
    + container.escapeExpression(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"id","hash":{},"data":data}) : helper)))
    + "\">1</span>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return "            <span class=\"aui-current-slide-index\" data-slide-listener=\""
    + container.escapeExpression(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"id","hash":{},"data":data}) : helper)))
    + "\">1</span>\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "        <button class=\"aui-slide-skip-next\"><i class=\"aui-icon-arrow-right-double-bold\"></i>Skip</button>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<button class=\"aui-slide-close\"><i class=\"aui-icon-cross\"></i></button>\n<ul class=\"simple-slide-list\">\n"
    + ((stack1 = container.invokePartial(partials.slides,depth0,{"name":"slides","data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</ul>\n<div class=\"simple-slide-count\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.slideshow_settings : depth0)) != null ? stack1.show_skip_buttons : stack1),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    <button class=\"aui-slide-previous\"><i class=\"aui-icon-arrow-left-bold\"></i>Previous</button>\n    <div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.slide_number_editable : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(5, data, 0),"data":data})) != null ? stack1 : "")
    + "        <span class=\"aui-slide-pagination-text\">of</span><span class=\"aui-number-of-slides\">"
    + container.escapeExpression(((helper = (helper = helpers.number_of_slides || (depth0 != null ? depth0.number_of_slides : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"number_of_slides","hash":{},"data":data}) : helper)))
    + "</span>\n    </div>\n    <button class=\"aui-slide-next\"><i class=\"aui-icon-arrow-right-bold\"></i>Next</button>\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.slideshow_settings : depth0)) != null ? stack1.show_skip_buttons : stack1),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>";
},"usePartial":true,"useData":true});

this["aui"]["templates"]["aui_slides"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <li data-slide-id=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" style=\"display: none;\">\n        <div class=\"simple-slide-image-alignment-element\">\n            <div class=\"simple-slide-image-container\">\n                <img data-src=\""
    + alias4(((helper = (helper = helpers.image || (depth0 != null ? depth0.image : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"image","hash":{},"data":data}) : helper)))
    + "\" class=\"aui-slide-img\">\n            </div>\n        </div>\n        <div class=\"aui-caption\">\n            <div class=\"aui-caption-heading\">"
    + ((stack1 = ((helper = (helper = helpers.heading || (depth0 != null ? depth0.heading : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"heading","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</div>\n            <div class=\"aui-caption-content\">"
    + ((stack1 = ((helper = (helper = helpers.content || (depth0 != null ? depth0.content : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"content","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</div>\n        </div>\n    </li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.slides : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"useData":true});

"use strict";
/* global Handlebars */
/* global h */
(function($) {

    /*
     * This is the core javascript used throughout the entire system.
     * Only add code in here that you think will be used in edit and record screens.
     *
     *
     * Templates
     * ---------
     * We have template methods wrapped around Handlebars for convenience
     * and to make the code less dependent on Handlebars. These methods are
     * always preferred over the direct Handlebars methods. We also set up a
     * number of template helper methods that are useful for the whole system.
     *
     * Page
     * ----
     * The page module provides a consistent interface for dealing with pages/windows
     * opened in different ways. It also contains important information about each
     * page.
     *
     * Local storage
     * -------------
     * Wrapper around localforage, to reduce dependency.
     *
     * Server requests
     * ---------------
     * All server requests should go through the 'request' method in this file, this gives us a
     * single point of control over all server requests made in the system.
     *
     * Events
     * ------
     * Event listeners that are relevant throughout the whole system can be set here. The same
     * applies to keyboard shortcuts.
     *
     * UI
     * ---
     * The ui module defines app specific ui methods and provides an interface for any ui methods
     * defined outside the app (such as artlogicui). This reduces dependency and lets us modify
     * generic methods with app specific settings or features.
     *
     * Error handling
     * --------------
     * The error handling is defined in this file as it is the most core file used
     * throughout the system. We send JS error to server, which sets up a task in wrike
     * and sends out an email to us.
     *
     *
     */

    // dependencies
    var _localforage = window.localforage,
        _utils = window.aui.utils;

    window.api_root = function() {
        // aol_prefs might not be available
        if (window.aol_prefs) {
            return '/' + window.aol_prefs.site + '/api/';
        } else {
            return undefined;
        }
    };

    var MESSAGES = {
        reload_paged_changed: "There are unsaved changes on this page. All unsaved changes will be lost if you reload before saving",
        reload_children_changed: "There are docked pages with unsaved changes. All unsaved changes will be lost if you reload before saving.",
        data_download_disclaimer_heading: "Personal data protection",
        data_download_disclaimer: "Exporting information from Artlogic makes it less secure. Be careful to restrict unauthorised access to personal data."
        //data_download_disclaimer: "Exporting information from Artlogic makes it less secure. Be careful to restrict unauthorised access to personal data. Any unauthorised access is a data breach and you may have to report it to the authorities."
    };

    window.app = {
        init: function() {

            var that = this;

            // make aui use the request method so we get error logs
            window.aui.request_method = this.request;

            // add title to page object
            if (!this.page.title) {
                this.page.update('title', document.title);
            }

            // initialise dock ui
            if (window.artlogic_dock) {
                this.init_dock();
            }

            this.init_handlebars_helpers();
            this.event_listeners();
            this.validate_temp_password();

            // ARTLOGIC UI - settings
            window.aui.settings.site = window.aol_prefs.site;

            // overlay_box settings
            window.aui.overlay_box.settings.button_default_class = "aui-button-extra-round";
            window.aui.overlay_box.settings.animation = "scale";
            window.aui.overlay_box.settings.animation_speed_in = 400;
            window.aui.overlay_box.settings.animation_speed_out = 400;
            window.aui.overlay_box.settings.title_class = "popup-header";

            if (window.aui.meta.window_width < 600) {
                window.aui.overlay_box.settings.animation = "slide-up";
                // window.aui.overlay_box.settings.animation = "slide-left-bounce";
                window.aui.overlay_box.settings.animation_speed_in = 500;
                window.aui.overlay_box.settings.animation_speed_out = 500;
                window.aui.overlay_box.settings.fullscreen = true;
                window.aui.overlay_box.settings.no_padding = true;
                window.aui.overlay_box.settings.box_width = "100%";
                //window.aui.overlay_box.settings.box_height = "50%";
                //window.aui.overlay_box.settings.valign = "bottom";
                //window.aui.overlay_box.settings.transition_speed = 0;
            }

            // FIXME: This will break the header on browser resize
            if (window.aui.meta.window_width < 1080 && !window.page_settings.homepage_and_upgrades) {
                window.aui.settings.animate_header = false;
            }

            this.load_templates();
            this.preload_fonts();
            // parse url for app state
            window.app.parse_url_for_state();

            window.app.local_storage.get_item("app_safe_mode", function(value) {
                if (value) {
                    $(".aol-toggle-safe-mode").addClass("active");
                    $(".aol-toggle-safe-mode").find(".onoff-switch-track").addClass("on");
                    $("body").addClass("aol-safe-mode");
                    window.app.safe_mode = true;
                }
            });

            window.app.aol_id = (document.cookie.split('aol_id=')[1] || '').split(';')[0];
            window.app.time_of_last_usage_notification = 0;
            window.app.license_enforcement.listen_to_activity();
            if (window.app.aol_id && (window.page_settings.enable_license_session_lock == 1 || window.page_settings.enable_license_notifications == 1) && !app.page.is_docked && window.page_settings.logged_in) {
                    window.app.license_enforcement.get_activity();
            }
            // if (window.is_session_lock_screen && window.session_locked_until) {
            //     window.app.license_enforcement.countdown();
            // }

            if (window.localStorage.getItem('on_login_logo_animated') === 'false') {
                this.animate_logo();
                window.localStorage.setItem('on_login_logo_animated', true);
            }

            $(document).trigger("app-init");

           if (window.page_settings.has_member_features) {
               window.app.member_events_init_section()
            }

            // homepage and upgrades project
            that.global_toolbar_modals.init();
            that.mobile_global_toolbar_search.init();
            that.mobile_global_settings_menu.init();
            that.system_update_notifications.init();
            that.product_switcher.init();

            // init global search sns (the one that searches both artworks and contacts)
            that.global_search_sns.init('main_toolbar_global_search_sns');

            that.dev_banner.init();

            // On page load we need to get the user's active Gmail login session from the tokens table `oauth_tokens_gmail`
            if (
                window.page_settings.has_access_to_sp_v2 &&
                window.page_settings.has_access_to_gmail &&
                window.page_settings?.user.id !== 0 // They should not be a magic password user
            ) {
                const url = `/${window.aol_prefs?.site}/api/v4/user/${window.page_settings.user.id}/token`;
                this.fetchGmailTokens(url);
            }

            try {
                const stored_cookie_preferences = window.localStorage.getItem('cookie_preferences');
                if (stored_cookie_preferences && stored_cookie_preferences !== "undefined" && JSON.parse(stored_cookie_preferences).statistics) {
                    const pendo_cache = 'pendo_additional_stats-' + window.aol_prefs?.site;
                    const cached = JSON.parse(window.localStorage.getItem(pendo_cache)); // returns null if localStorage item does not exist
                    const current_timestamp = Date.now();
                    // Discard cached values if they are older than one day (86400000ms)
                    if ((!cached || (cached && cached.timestamp + 86400000 < current_timestamp)) && window.page_settings?.logged_in) {
                        window.app.request({
                            url: window.app.api_urls.get_pendo_additional_stats,
                            dataType: 'json',
                        }).then((response) => { if (response) {
                            window.localStorage.setItem(pendo_cache, JSON.stringify({
                                ...response,
                                timestamp: current_timestamp
                            }));
                        }}).fail(() => {
                            window.localStorage.setItem(pendo_cache, JSON.stringify({
                                ...(cached || {}),
                                error: 'request error to /api/data/statistics/get_pendo_additional_stats/',
                                timestamp: current_timestamp
                            }));
                        });
                    }
                }
            } catch (e) {
                console.log('Error while trying to get additional stats for Pendo', e);
            }
        },

        clearTokens: function () {
            const keys = [
                "accessToken",
                "refreshToken",
                "expiresAt",
                "expiresIn",
                "tokenType",
                "tokenId",
            ];
            keys.forEach((key) => localStorage.removeItem(key));
        },
        saveTokens: function (tokens) {
            const tokenKeys = {
                accessToken: "access_token",
                refreshToken: "refresh_token",
                expiresAt: "expires_at",
                expiresIn: "expires_in",
                tokenType: "token_type",
                tokenId: "id",
            };

            for (const [key, value] of Object.entries(tokenKeys)) {
                localStorage.setItem(key, tokens[value]);
            }
        },
        fetchGmailTokens: async function (url) {
            try {
                // Await the fetch request to get the user's gmail tokens
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(
                        `HTTP error fetching Gmail tokens - status: ${response.status}`,
                    );
                }
                // Await the response transformation
                const tokens = await response.json();

                if(tokens.error){
                    console.error("There was an error fetching the user's gmail tokens: ", tokens.error)
                    this.clearTokens();
                    return null;
                }
                // Save the tokens to the localStorage for authentication when navigating
                // to the sales pipeline send offer email page
                this.saveTokens(tokens);
            } catch (error) {
                console.error("Could not fetch Gmail tokens: ", error);
                return null;
            }
        },


        global_toolbar_modals: {
            init: function () {
                if ($('.aui-global-toolbar-modal-open-button').length) {
                    $(document).click(function (event) {
                        //if you click on anything except the modal itself or the "open modal" link, close the modal
                        if (!$(event.target).closest(".aui-global-toolbar-modal, .mlm-list.mlm-root, .aui-global-toolbar-modal-open-button").length) {
                            $(".aui-global-toolbar-modal-parent").removeClass("active");
                            $('.aui-global-toolbar-modal, .mlm-list.mlm-root').removeClass('show');
                        }
                    });

                    $('.aui-global-toolbar-modal-open-button').each(function () {
                        var $button = $(this);
                        $button.click(function () {
                            var $parent = $(this).closest('.aui-global-toolbar-modal-parent');
                            var $modal = $parent.find('.aui-global-toolbar-modal, .mlm-list.mlm-root');

                            if ($modal.hasClass('show')) {
                                $modal.removeClass('show');
                                $parent.removeClass('active');
                            } else {
                                $(".aui-global-toolbar-modal-parent").removeClass("active");
                                $('.aui-global-toolbar-modal, .mlm-list.mlm-root').removeClass('show');
                                $modal.addClass('show');
                                $parent.addClass('active');
                            }
                        });
                    });
                }
            },
        },
        mobile_global_settings_menu: {
            init: function () {
                const that = this;
                that.run();

                $(window).on('resize', function() {
                    that.run();
                });
            },
            run: function () {
                const mobile_breakpoint = 768;
                const $globalTopNavSettingsItems = $('.mlm-list-item');

                $globalTopNavSettingsItems.each(function () {
                    const $item = $(this);
                    const $dropdownList = $item.children('ul');
                    if (window.innerWidth <= mobile_breakpoint) {
                        if ($dropdownList.length) {
                            const $dropdownToggle = $item.children('a');
                            // Check if element already has a click event listener
                            if (!$dropdownToggle.data('clickEventAttached')) {
                                // Attach the click event listener
                                $dropdownToggle.on('click', function () {
                                    $(this).toggleClass('active');
                                    $dropdownList.slideToggle();
                                })

                                // Set the flag indicating the click event listener is attached
                                $dropdownToggle.data('clickEventAttached', true);
                            }
                        }
                    }  else {
                        // Remove styles left by slideToggle
                        $('.mlm-list').removeAttr('style');
                        // Remove click event listener and reset flag
                        $item.children('a').removeClass('active').off('click').data('clickEventAttached', false);
                    }
                });
            }
        },

        mobile_global_toolbar_search: {
            init: function () {
                $(".aui-global-toolbar-mobile-open-search").click(function() {
                    $(".aui-global-toolbar-search-container").addClass("mobile-show");
                    $(".aui-global-toolbar-search-container").find("input").click();
                    $(".aui-global-toolbar-search-container").find("input").focus();

                    $('.aui-global-toolbar-search-container').click(function (event) {
                        if (this == event.target) {
                            $(".aui-global-toolbar-search-container").find("input").blur();
                            $(".aui-global-toolbar-search-container").removeClass("mobile-show");
                        }
                    });
                })
            }
        },

        system_update_notifications: {
            init: function () {
                this.event_handlers();
                const cutoff_date = this.get_cutoff_date();
                const unread_updates = this.get_updates_since_date(cutoff_date);
                if (!unread_updates.length) {
                    return;
                }
                this.add_bell_indicator();
                this.mark_updates_since_date_as_unread(cutoff_date);
            },
            clear_data: function () {
                /* Clear the last read date. Useful for developing.
                Use with window.app.system_update_notifications.clear_data(); */
                localStorage.removeItem("last_system_update_view_date-" + window.page_settings.user.id);
            },
            event_handlers: function () {
                const that = this;

                $(".gtt-notifications > button").click(function () {
                    /* click bell icon */
                    that.update_last_read_date();
                    that.remove_bell_indicator();
                });

                $(".system-updates-mini > div").click(function () {
                    $(this).removeClass("unread");
                });
            },
            get_last_read_date: function () {
                const stored_date = localStorage.getItem("last_system_update_view_date-" + window.page_settings.user.id);
                if (!stored_date) {
                    return null;
                }
                return new Date(stored_date);
            },
            update_last_read_date: function () {
                const date = new Date();
                localStorage.setItem("last_system_update_view_date-" + window.page_settings.user.id, date.toISOString().substring(0, 10));
            },
            get_cutoff_date: function () {
                /* Return the last read date, if greater than 30 days ago, otherwise return the date
                30 days ago */
                const last_read_date = this.get_last_read_date();
                const thirty_days_ago = new Date(new Date().setDate((new Date()).getDate() - 30));
                return new Date(Math.max(last_read_date, thirty_days_ago));
            },
            get_updates_since_date: function (date) {
                return window.page_settings.system_updates.filter((update) => new Date(update.date) > date);
            },
            add_bell_indicator: function () {
                /* Add the red dot to the bell icon */
                $(".gtt-notifications").addClass("unread");
            },
            remove_bell_indicator: function () {
                /* Remove the red dot from the bell icon */
                $(".gtt-notifications").removeClass("unread");
            },
            mark_updates_since_date_as_unread: function (cutoff_date) {
                /* in the notifications dropdown, mark any unread rows as "unread" */
                $(".system-updates-mini > div").each(function () {
                    const date = new Date($(this).attr("data-date"));
                    if (date > cutoff_date) {
                        $(this).addClass("unread");

                    }
                });
            },
        },

        product_switcher: {
            init: function () {
                this.event_handlers();
            },
            event_handlers: function() {
                const that = this;
                $('.product-switcher-submenu-button').click(function () {
                    that.click_submenu_button($(this));
                });
            },
            click_submenu_button: function ($btn) {
                const $submenu = $btn.next();
                const $chevron = $btn.children().find('.psr-submenu-icon')
                if (!$submenu.height()) {
                    /* open submenu */
                    $submenu.height($submenu.children().height());
                    /* rotate chevron */
                    $chevron.css('transform', 'rotate(180deg)');
                } else {
                    /* close submenu */
                    $submenu.height(0);
                    /* unrotate chevron */
                    $chevron.css('transform', 'rotate(0deg)');
                }
            }
        },

        homepage_and_upgrades_switcher: {
            load: function(option) {
                var that = window.app.homepage_and_upgrades_switcher;
                if (option) {
                    that.store_user_pref(option);
                } else {
                    var stored_theme = that.get_stored_user_pref();
                    if (stored_theme) {
                        that.load(stored_theme);
                    }
                }
            },
            store_user_pref: function(option) {
                var data = {
                    key: 'homepage_and_upgrades',
                    value: option,
                    merge: 'True'
                };
                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/preferences/set',
                    data: data,
                    method: 'POST',
                }).then(()=> window.app.page.reload());
            },
            get_stored_user_pref: function(option) {
                var current_theme = '';
                var data = {'user_preference': 'homepage_and_upgrades'};
                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/preferences/get',
                    data: data,
                    method: 'POST',
                    success: function(result) {
                        (result.value['homepage_and_upgrades']) ? current_theme = result.value['homepage_and_upgrades']: current_theme = 'legacy';
                    },
                });
                return current_theme;
            }
        },

        dev_banner: {

            /*
            Set to true for local testing only
            Will show banner locally and allow hiding for non-admin users
            */
            testing: false,

            init: function() {
                /*
                Shows a banner to warn when developers when on a live (non-demo) site
                */
                var that = window.app;
                if (window.page_settings.user.is_developer) {
                    var show_local_banner = this.testing,
                        hide_for_artlogic_admin = this.hide_for_artlogic_admin(),
                        no_show_sites = ['artlogictraining','clientteam','artsydemo','clockhousedemo','spdemo','clientteamdemo','oafdemo','websitetemplatedemo','livedemo','adaademo','nadademo','usclientteamdemo','synergydemo', 'daxiang'],
                        close_button = window.page_settings.user.artlogic_admin || this.testing ? '<button class="dev-banner-close-btn">&times;</button>' : '';

                    if (!hide_for_artlogic_admin) {
                        if (window.aol_prefs.is_production) {
                            if (!no_show_sites.includes(window.aol_prefs.site)) {
                                $('body').addClass('dev-banner-shown');
                                if (window.aol_prefs.is_authoritative) {
                                    $('body').prepend('<div class="dev-banner live">LIVE SITE'+close_button+'</div>');
                                } else {
                                    $('body').prepend('<div class="dev-banner test">TEST / STAGING SITE'+close_button+'</div>');
                                }
                            }
                        } else {
                            if (show_local_banner) {
                                $('body').addClass('dev-banner-shown');
                                $('body').prepend('<div class="dev-banner local">LOCAL SITE'+close_button+'</div>');
                            }
                        }
                    }
                }
            },

            hide_for_artlogic_admin: function(){
                /*
                Check if artlogic_admin hid the banner for this site less than 24 hours ago
                */
                var that = window.app,
                    timestamp_seconds = Date.now() / 1000;

                that.dev_banner_hidden_check = 'dev_banner_hidden_' + window.aol_prefs.site;

                if (window.page_settings.user.artlogic_admin || this.testing) {
                    if (window.localStorage.getItem(that.dev_banner_hidden_check)) {
                        var time_hidden = JSON.parse(window.localStorage.getItem(that.dev_banner_hidden_check));
                        if (timestamp_seconds - time_hidden < 86400) {
                            return true;
                        }
                    }
                }

                return false;
            },

            hide: function() {

                var that = window.app,
                    timestamp_seconds = Date.now() / 1000;

                $('.dev-banner').hide();
                $('body').removeClass('dev-banner-shown');

                window.localStorage.setItem(that.dev_banner_hidden_check, timestamp_seconds);

            }
        },

        animate_logo: function () {
            $('body:not(.reskin-v1) .aol-logo-container #logo').addClass('animate');
        },
        init_dock: function() {
            var module_settings = {
                header: false,
                on_create: function() {
                    $("body").addClass("aol-dock-modules-exist");
                }
            };

            if (window.aui.meta.window_width > 700) {
                module_settings.width = window.app.page.is_docked ? "95%" : "80%";
                module_settings.max_width = "1200px";
            } else {
                module_settings.width = "100%";
                module_settings.max_width = "none";
            }

            window.artlogic_dock.init({
                main_content_selector: "#big-wrapper, .aui-pane",
                module_settings: module_settings
            });

            if (window.app.page.is_docked && !window.page_settings.disable_open_external) {
                $("#aui-footer-content").append("<button class='aol-open-externally'><i class='fa fa-external-link'></i></button>");
            }

        },
        show_dock_menu: function(element) {

            var template = "<ul class='stickybox-menu aol-active-dock-module-menu'>{{#each modules}}<li><button class='aol-dock-menu-module-close {{#if changed}}disabled{{/if}}' data-id='{{id}}'><i class='aui-icon-cross'></i></button><button class='aol-dock-module-open {{#if changed}}changed{{/if}}' data-id='{{id}}'>{{title}}</button></li>{{/each}}</ul><button class='aui-button-simple-arrow close-all-unchanged-dock-btn'>Close all unchanged</button>";
            var content = Handlebars.compile(template)({modules: parent.artlogic_dock.modules});
            element.stickyBox(content, {
                id: 'aol-dock-menu',
                width: '200px',
                fixed: true,
                z_index: 1000,
                on_load: function() {
                    $(".aol-dock-module-open").off("click.open_module").on("click.open_module", function() {
                        window.app.log_user_action("Clicked on a dock module in dock menu");
                        var id = $(this).data("id");
                        parent.artlogic_dock.open_module(id);
                        window.aui.stickybox.close();
                    });
                    $(".close-all-unchanged-dock-btn").off("click.close_all_modules").on("click.close_all_modules", function() {
                        window.app.log_user_action("Clicked on 'Close all unchanged' button in dock menu");
                        var i = parent.artlogic_dock.modules.length;
                        while (i--) {
                            var module = parent.artlogic_dock.modules[i];
                            if (!module.changed) {
                                close_module(module.id);
                            }
                        }
                    });
                    $(".aol-dock-menu-module-close:not(.disabled)").off("click.close_module").on("click.close_module", function() {
                        window.app.log_user_action('Clicked on dock module close button in dock menu');
                        var module_id = $(this).data("id");
                        close_module(module_id);
                    });

                    function close_module(module_id) {
                        var module_element = $(".aol-active-dock-module-menu [data-id='"+module_id+"']").parent();
                        parent.artlogic_dock.destroy_module(module_id);
                        module_element.addClass("docked-page-destroyed");
                        module_element.on("animationend", function() {
                            $(this).remove();
                        });
                    }

                }
            });

        },
        preload_fonts: function() {
            // put some fonts on the page to force the browser to load them
            var font_loaders = "<b>2</b><div class='aui-icon-bold-flag'></div>";
            $("body").append("<div id='aol-font-loaders'>" + font_loaders + "</div>");
            setTimeout(function() {
                $("#aol-font-loaders").remove();
            }, 100);
        },
        parse_url_for_state: function() {
            /* parse the current url and construct a 'state' object we can reference
             * with window.app.state so we can load specific objects on the page,
             * e.g. second page of results or a specific record edit screen
             *
             * EXAMPLES:
             *
             * /<site>/records/artworks/main/2
             * {
             *     page: 2
             *     section: "records"
             *     site: "<site>"
             *     tablename: "artworks"
             *     view: "main"
             * }
             *
             * /<site>/records/artworks/main/2/edit/artworks/622
             * {
             *     action: "edit"
             *     action_rec_id: 622
             *     action_tablename: "artworks"
             *     page: 2
             *     section: "records"
             *     site: "<site>"
             *     tablename: "artworks"
             *     view: "main"
             * }
             *
             * /<site>/records/artworks/main/2/select/622
             * {
             *     action: "select"
             *     action_rec_id: 622,
             *     page: 2
             *     section: "records"
             *     site: "<site>"
             *     tablename: "artworks"
             *     view: "main"
             * }
             *
             */
            var url = document.location.href.split('?')[0].split('#')[0], seg;
            if (url.indexOf('://') > -1) {
                // convert to local url
                url = url.split('://')[1];
                var url_segs = url.split('/');
                url_segs.shift(); // remove first item
            } else {
                var url_segs = url.split('/');
            }
            for (var i = 0; i < 10; i ++) {
                // append some empty elements
                url_segs.push('');
            }
            var state = {};
            state['site'] = url_segs.shift();
            state['section'] = url_segs.shift() || 'home';
            state['tablename'] = url_segs.shift();
            seg = url_segs.shift(); // there may or there may not be a 'view'...
            if (seg && window.app.utils.is_digit(seg)) {
                state['page'] = parseInt(seg);
            } else if (seg && seg != 'edit' && seg != 'select') {
                state['view'] = seg;
            }
            seg = url_segs.shift(); // there may or there may not be a 'view'...
            if (seg && window.app.utils.is_digit(seg)) {
                state['page'] = parseInt(seg);
            }
            state['action'] = url_segs.shift(); // we're looking for an action, e.g. 'select' or 'edit'...
            if (state['action'] == 'select') {
                seg = url_segs.shift();
                if (seg && window.app.utils.is_digit(seg)) {
                    state['action_rec_id'] = parseInt(seg);
                }
            } else if (state['action'] == 'edit') {
                state['action_tablename'] = url_segs.shift();
                seg = url_segs.shift();
                if (seg && window.app.utils.is_digit(seg)) {
                    state['action_rec_id'] = parseInt(seg);
                } else {
                    state['action_tablename'] = '';
                }
            }
            window.app.state = state;
        },

        warning_notification_on_export: function() {
            // window.app.warning_notification_on_export()
            var deferred = $.Deferred(),
                has_notification_warning = window.page_settings['admin_export_notification_warning'];
            if (has_notification_warning) {
                window.h.confirm({
                    title: "Are you sure you wish to download this report?",
                    msg: "Selected admin users are notified about exports and downloads.",
                    box_width: 465,
                }).done(function(){
                    // continue with export / download...
                     deferred.resolve();
                }).fail(function(){
                    // do not export / download...
                    deferred.reject();
                });
            } else {
                // continue with export / download...
                deferred.resolve();
            }
            return deferred;
        },

        license_enforcement: {
            /**
             * Only a single user can log in at any time under a given license, other users will be locked out but may be able to
             * kick out the first user and log in.
             *
             * Control flow:
             * 1) user 1 logs in
             * 2) user 2 logs in, get_activity is called and finds another session, user 2 is locked.
             * 3) user 2 clicks 'Lock other user and log in'. activity_pong locks user 1, unlocks user 2,
             *    and pushes a message.
             * 4) user 1 recieves the message in listen_to_activity, lock screen is shown.
             * 5) user 1 clicks 'Continue working'. activity_pong locks user 2, unlocks user 1,
             *    and pushes a message.
             * 6) user 2 recieves the message in listen_to_activity, lock screen is shown. User 2 is now
             *    locked permanently.
             * If the screen is refreshed at any stage, get_activity will report the correct lock state.
             *
             * Lock states:
             * 0: not locked
             * 1: can unlock and lock other user, other user can lock back.
             * 2: can unlock and lock other user, other user can't lock back.
             * 3: permanently locked.
             * 0.5: special value returned by activity_get or activity pong,  not stored in the user record,
             *      that indicates the other user is the same user record.
             *      - can unlock and lock other user, other user can lock back. we want to ensure a single user can
             *      never permanently lock themselves out by failing to log out on another device.
             */

            notify: function(data) {
                var d = new Date(),
                    current_timestamp = d.getTime();
                if (current_timestamp - window.app.time_of_last_usage_notification > 60000) {
                    h.notify_in_browser('Someone else may be using your user record. Please report this to the administrator of your system.', {
                        duration: false,
                        close_on_outer_click: true
                    });
                    window.app.time_of_last_usage_notification = current_timestamp;
                }
            },

            lock_screen: function(data) {
                var deferred = $.Deferred();
                var lock_state = data.lock_state;
                var title = 'Your session has been locked';

                if (!$('#license-screen-lock-overlay').length && window.page_settings.enable_license_session_lock && lock_state) {
                    var content = '<p id="session-unlock-p">';
                    if (lock_state == .5) {
                        content += 'User details can only be used on one device at a time. To use this device, sign out of other devices or use the button below to lock them out, which will disrupt any work taking place.</p>';
                        content += '<div class="session_lock_alert_buttons"><button id="btn-unlock-and-lock-other" class="aui-button-simple">Lock other device and log in</a>';
                        title = 'Signing in on multiple devices';
                    } else if (lock_state == 1) {
                        content += (data.user || 'Someone else') + ' is already logged in with the same jobshare license. You won\'t be able to log in until they log out, or you can choose to lock their session and log in. This may disrupt their work.</p>';
                        content += '<div class="session_lock_alert_buttons"><button id="btn-unlock-and-lock-other" class="aui-button-simple">Lock other user and log in</a>';
                    } else if (lock_state == 2) {
                        content += (data.user || 'Someone else') + ' using the same jobshare license as you has chosen to lock your session so they could log in. Your session will remain locked until they log out, or you can choose to lock their session and continue using the system. This may disrupt their work.</p>';
                        content += '<div class="session_lock_alert_buttons"><button id="btn-unlock-and-lock-other" class="aui-button-simple">Continue working</a>';
                    } else if (lock_state == 3) {
                        content += (data.user || 'The person') + ' logged in on the same license as you has chosen to lock your session. It will remain locked until they log out.</p><div class="session_lock_alert_buttons">'
                    }
                    content += '<button id="btn-locked-logout" class="aui-button-extra-round">Logout</button></div>'
                    aui.overlay_box.load({
                        title: title,
                        content: content,
                        id: 'license-screen-lock-overlay',
                        close_on_click_outside: false,
                        box_width: 400,
                        callback: function() {
                            $('#btn-unlock-and-lock-other').on('click', function() {
                                window.app.license_enforcement.activity_pong(data.pong || data.sessions[0], 1);
                                window.fieldhelpers.add_spinner($(".aui-overlay-box-content-wrapper"), '35px');
                            });

                            $('#btn-locked-logout').on('click', function() {
                                window.location.href = aol_prefs.urls.aol_site_root + '/logout';
                            });
                        },
                        buttons: [
                            {
                                label: 'Close',
                                css_class: 'aui-button-extra-round hidden close-button',
                                cancel: true,
                                callback: function() {
                                    deferred.resolve();
                                }
                            }
                        ]
                    });
                }

                return deferred.promise();
            },

            unlocked: function() {
                aui.overlay_box.close(null, $('#license-screen-lock-overlay'));
                if (window.is_session_lock_screen) {
                    location.reload();
                }
            },

            activity_pong: function(target_cookie_id, unlock_self, notify) {
                app.request({
                    url: '/' + aol_prefs.site + '/api/data/users/sessions/activity_pong',
                    dataType: 'json',
                    method: 'POST',
                    data: {
                        target_cookie_id: target_cookie_id,
                        unlock_self: unlock_self,
                        notify: notify,
                        path: window.location.pathname
                    }
                }).then(function(result) {
                    window.app.license_enforcement.unlocked();
                });
            },

            listen_to_activity: function() {
                window.pusher_listener(window.page_settings.pusher_global_channel_id, function(data) {
                    data = window.h.parse_pusher_response(data);
                    if (window.app.aol_id && (window.page_settings.enable_license_session_lock == 1 || window.page_settings.enable_license_notifications == 1) && !app.page.is_docked && window.page_settings.logged_in) {
                        if (data.action == 'session_locking' && data.cookie_id == window.app.aol_id) {
                            if (data.unlocked) {
                                window.app.license_enforcement.unlocked();
                            } else if (data.is_locked) {
                                window.app.license_enforcement.lock_screen(data);
                            } else if (data.other_login_notification) {
                                window.h.notify('Someone else has logged in with the same user license. Please follow our <a href="https://support.artlogic.net/hc/en-gb/articles/360008574079#Artlogic_Database">user license best practices guidelines</a> or contact us.', {duration: 6000});
                            }
                        }
                    } else if (data.cookie_id == window.app.aol_id && data.terminated) {
                        location.pathname = '/' + aol_prefs.site + '/logout';
                    }
                });
            },

            get_activity: function() {
                app.request({
                    url: '/' + aol_prefs.site + '/api/data/users/sessions/activity_get',
                    dataType: 'json',
                    method: 'POST'
                }).then(function(result) {
                    if (result.sessions && result.sessions.length) {
                        if (window.page_settings.enable_license_session_lock) {
                            window.app.license_enforcement.lock_screen(result);
                        } else if (window.page_settings.enable_license_notifications) {
                            window.h.alert('Someone else is already logged in with the same user license. This isn’t a behaviour we would recommend for security reasons. Each user should be using their own licence and this issue should be addressed now. Please follow our <a href="https://support.artlogic.net/hc/en-gb/articles/360008574079#Artlogic_Database">user license best practices guidelines</a> or contact us.');
                            window.app.license_enforcement.activity_pong(result.sessions[0], 0, 1);
                        }
                    }
                });
            },

            countdown: function(data) {
                // unused
                // from https://www.w3schools.com/jsref/met_win_setinterval.asp
                // Set the date we're counting down to
                if (data) {
                    var countDownDate = new Date(data.locked_until || 0).getTime();
                }
                else {
                    countDownDate = new Date(window.session_locked_until || 0).getTime();
                }

                // Update the count down every 1 second
                clearInterval(window.session_lock_countdown);
                window.session_lock_countdown = setInterval(function() {

                  // Get todays date and time
                  var now = parseInt(new Date().getTime() / 1000);

                  // Find the distance between now and the count down date
                  var distance = countDownDate - now;

                  // Time calculations for days, hours, minutes and seconds
                  var minutes = Math.floor((distance % 3600) / 60);
                  var seconds = distance % 60;
                  var pad = '';
                  if (seconds < 10) {
                    pad = '0';
                  }

                  // Display the result in the element with id="demo"
                  document.getElementById("countdown").innerHTML = minutes + ":" + pad + seconds;
                  $('#session-unlock-p').removeClass('hidden');
                  $('#session-unlocked-p').addClass('hidden');

                  // If the count down is finished, write some text
                  if (distance < 0) {
                    clearInterval(window.session_lock_countdown);
                    document.getElementById("countdown").innerHTML = "0:00";
                    $('#session-unlock-p').addClass('hidden');
                    $('#session-unlocked-p').removeClass('hidden');
                  }
                }, 1000);
            },

            remove_page_content: function() {},

            create_user_license: function() {
                var number = h.uid16();
                var data = {
                    _save: 1,
                    _save_record: 1,
                    _conf_name: 'user_licenses',
                    'user_licenses--number': number,
                    tablename: 'user_licenses',
                };

                var double_confirm_selection = function() {
                    let buttonOff = function() {
                        return $('.aui-overlay-box-buttons-right').find('.aui-button-extra-round').addClass( "disabled" ).prop('disabled', true);
                    }
                    let buttonOn = function() {
                        return $('.aui-overlay-box-buttons-right').find('.aui-button-extra-round').removeClass( "disabled" ).prop('disabled', false);
                    }
                    buttonOff();

                    $("input[id='agree-to-user-license-terms']").change(function() {
                        if(this.checked) {
                           buttonOn();
                        } else {
                            buttonOff();
                        }
                    })
                }

                var title = 'Purchase additional user license';
                var html = '<p>User licences are <em>billable extras</em> that are added to your quarterly invoice.</p>\
                            <p>Please review and accept the following terms before creating an additional user license:</p>\
                            <ul><li>Additional user license are charged at <strong>£35 per month</strong></li>\
                            <li>User licenses are billed on a <strong>quarterly basis</strong></li>\
                            <li>There is a <strong>90 day cancellation period</strong> for additional user licenses and other billable extras</li>\
                            </ul>\
                            <label class="aui-custom-checkbox flabel"><input id="agree-to-user-license-terms" type="checkbox" class="f-bool" /><span>I have read and accepted the terms described above</span></label>';
                window.h.confirm({title: title, msg: html, load_callback: double_confirm_selection}).then(function() {
                    return window.app.request({
                        url: app.api_urls.save,
                        data: data,
                        method: 'POST',
                        dataType: 'json'
                    });
                }).then(function(result) {
                    var new_rec_id = result.result;
                    var new_rec_label = result.record.label
                    if (window.browse && window.browse.user_licenses) {
                        window.browse.user_licenses.init_main_list_select_on_render(new_rec_id);
                        window.browse.main_list.reload();
                    } else if (window.edit && window.edit.users) {
                        window.edit.field('users', 'user_license_id').append($("<option></option>")
                            .attr("value",new_rec_id)
                            .text(new_rec_label)).val(new_rec_id);
                        window.edit.users.settings.new_user_license_created();
                    }
                    window.h.alert('User license ' + '<strong>' + new_rec_label + '</strong>' + ' created.');
                }).then(function() {
                    return window.app.request({
                        url: app.api_urls.base + 'data/user_licenses/notify/',
                        method: 'POST',
                        dataType: 'json'
                    });
                });
            }
        },

        ///////////////////////////////////
        // PAGE HANDLER
        ///////////////////////////////////

        page: (function () {
            var page = {},
                dock_module = window.artlogic_dock ? window.artlogic_dock.get_parent_module() || {} : {};

            // close the current page
            page.close = function () {

                var promise = $.Deferred();

                if (this.on_before_close_unsaved && this.changed) {
                   promise = this.on_before_close_unsaved();
                   this.confirmed_unload = true;
                } else {
                    promise.resolve();
                }

                promise.then(function () {

                    if (window.app.page.ui == 'box' && window.parent) {
                        window.parent.app.ui.popup.close();
                    } else {
                        window.close();
                    }

                });
            };

            // destroy the current page
            page.destroy = function () {
                this.close();
            };



            // focus the page
            page.focus = function() {
                window.focus();
            };



            // override page with dock properties
            $.extend(page, dock_module);

            // reload current page
            page.reload = function (post) {
                //if (post) {

                // use open method instead of location.reload
                // to prevent form resubmit alert
                // (was happening in firefox)
                window.app.page.open($.extend(window.app.page.settings, {
                    ui: 'replace',
                    post_data: post,
                    url: window.location.href
                }));

                //} else {
                //    window.location.reload();
                //}
            };

            // update a property of the page object
            page.update = function (property, value) {
                var update_dock = true;

                switch (property) {

                    case 'title':
                        var value_no_html = value.replace(/<[^>]+>/g, '');
                        document.title = value_no_html;
                        $("title").html(window.app.page.tab_icon + value_no_html);
                        $(window.app.page.title_element).html(value_no_html);

                        break;

                    case 'name':
                        window.name = value;
                        window.app.page.id = value;
                }

                window.app.page[property] = value;

                if (dock_module.update) {
                    dock_module.update(property, value);
                    if (window.parent.app) {
                        window.parent.app.children_changed_handler();
                    }
                }
            };

            page.tab_icon = '';

            page.open_windows = {};
            page.open_window_ids = {};
            page.opened_list = [];

            page.open_blank = function (ui) {
                /*
                 * Use this when you need to open a window after running async code
                 * (the browser will prevent opening a window using app.page.open() after
                 * async code). Call this function before running the async code, then
                 * call the 'open' method that this function returns after the async code.
                 *
                 * Example:
                 *
                 * var new_window = window.app.page.open_blank('tab');
                 * window.app.request().then(function() { new_window.open({url: '/my-page'}) });
                 *
                 */
                var window_id = window.app.utils.get_uid(),
                    new_window = window.app.page.open({
                        url: 'javascript:void(0)',
                        id: window_id,
                        ui: ui,
                    });

                return {
                    open: function (options) {
                        if (new_window.open_url) {
                            new_window.open_url(options);
                        } else {
                            window.app.page.open($.extend({}, options, {
                                id: window_id,
                                ui: ui,
                            }));
                        }
                    }
                };
            };

            page._open_dock = function (options) {
                var module = window.artlogic_dock.create_module({
                        id: options.id,
                        url: options.url,
                        title: options.title,
                        form: options.form,
                        on_hide: function (instance) {
                            window.app.page.focus();
                            if (instance.window && instance.window.aui) {
                                instance.window.aui.stickybox.close('aol-dock-menu');
                            }
                        },
                        on_destroy: function (module_settings, was_showing, additional_actions) {
                            // remove module from list
                            window.app.utils.remove_from_array(parent.app.page.opened_list, options.id);
                            // tell the page that it's been removed in case we need to do another action
                            $('body').trigger('dock-module-removed', {module_id: module_settings.id, action: additional_actions});
                            // open page that was showing before
                            var page_to_open = parent.app.page.opened_list[parent.app.page.opened_list.length-1] || (parent.artlogic_dock.modules[parent.artlogic_dock.modules.length-1] || {}).id;
                            if (parent.artlogic_dock.modules.length && was_showing) {
                                parent.artlogic_dock.open_module(page_to_open, true);
                            }
                        }
                    });

                window.app.utils.remove_from_array(parent.app.page.opened_list, options.id);
                window.app.page.opened_list.push(options.id);
                // note: for some reason setTimeout is necessary for the animation to work in ios safari
                setTimeout(function () {
                    module.open();
                });

                return module;
            };

            page._create_form = function (options) {

                var form = document.createElement("form");

                form.target = "page_" + options.id;
                form.method = options.method;
                form.action = options.url;

                for (var property in options.post_data) {
                    if (options.post_data.hasOwnProperty(property)) {
                        var input = document.createElement("input");
                        input.type = "hidden";
                        input.name = property;
                        input.value = options.post_data[property];
                        form.appendChild(input);
                    }
                }

                return form;
            };

            // open a new page
            page.open = function (options) {
                var that = this,
                    defaults = {
                        id: window.aui.utils.get_uid(),
                        ui: "dock",
                        form_method: "post",
                        guid: window.h.uid32()
                    },
                    settings = $.extend({}, defaults, options),
                    form;

                if (settings.event) {
                    if (settings.event.metaKey) {
                        settings.ui = "tab";
                    }
                }

                // post data to new page
                if (settings.post_data) {

                    form = this._create_form({
                        id: settings.id,
                        method: settings.form_method,
                        url: settings.url,
                        post_data: settings.post_data
                    });

                    document.body.appendChild(form);
                }
                // determine how the page is displayed
                switch (settings.ui) {

                    case "dock":
                        var module = that._open_dock({
                            id: (window.conf ? window.conf.name : window.page_settings.tablename) + "_" + settings.id + (settings.id == 'offer-selected' ? '_' + settings.guid : ''),
                            url: settings.url,
                            title: settings.title,
                            form: form
                        });
                        break;

                    case "dock_parent":
                        var module = window.parent.app.page._open_dock({
                            id: (settings.conf ? settings.conf : window.conf ? window.conf.name : window.page_settings.tablename) + "_" + settings.id + (settings.id == 'offer-selected' ? '_' + settings.guid : ''),
                            url: settings.url,
                            title: settings.title,
                            form: form
                        });
                        break;

                    case "tab":

                        if (that.open_windows[settings.id]) {
                            if (that.open_windows[settings.id].closed) {
                                that.open_windows[settings.id] = window.open(form ? 'javascript:void(0)' : settings.url, "page_" + settings.id, settings.popup ? window_options : undefined);
                                that.open_window_ids[settings.id] = true;
                            } else {
                                // TODO: currently not working in IE or FF
                                that.open_windows[settings.id].focus();
                            }
                        } else {
                            that.open_windows[settings.id] = window.open(form ? 'javascript:void(0)' : settings.url, "page_" + settings.id, settings.popup ? window_options : undefined);
                            that.open_windows[settings.id].focus();
                            that.open_window_ids[settings.id] = true;
                        }

                        if (form) {
                            window.app.add_csrf_input_element(form);
                            form.submit();
                        }

                        break;

                    case "replace":

                        var promise = $.Deferred();

                        if (this.on_before_close_unsaved && this.changed) {
                           promise = this.on_before_close_unsaved();
                           this.confirmed_unload = true;
                        } else {
                            promise.resolve();
                        }

                        promise.then(function () {

                            if (form) {
                                window.app.add_csrf_input_element(form);
                                form.target = "";
                                form.submit();
                            } else {
                                window.location.href = settings.url.split('#')[0]; // remove hash, otherwise reload doesn't work
                            }

                        });

                        break;

                    case "window":

                        var w = 1081,
                            h = window.aui.meta.window_height,
                            l = (screen.availWidth-w)/2,
                            t = ((screen.availHeight-h)/3)-40,
                            window_options = "width=" + w + ", height=" + h + ", top=" + t + ", left=" + l;

                        if (that.open_windows[settings.id]) {
                            if (that.open_windows[settings.id].closed) {
                                that.open_windows[settings.id] = window.open(form ? '' : settings.url, "page_" + settings.id, window_options);
                                that.open_window_ids[settings.id] = true;
                            } else {
                                // TODO: currently not working in IE or FF
                                that.open_windows[settings.id].focus();
                            }
                        } else {
                            that.open_windows[settings.id] = window.open(form ? '' : settings.url, "page_" + settings.id, window_options);
                            that.open_windows[settings.id].focus();
                            that.open_window_ids[settings.id] = true;
                        }

                        if (form) {
                            window.app.add_csrf_input_element(form);
                            form.submit();
                        }

                        break;

                    case "box":

                        var iframe = "<iframe class='aol-page-iframe' name='"+settings.id+"'></iframe>",
                            box_id = 'app-page-open-box-' + window.app.utils.get_uid();

                        window.app.ui.popup.load({
                            //id: box_id,
                            id: settings.id,
                            content: iframe,
                            buttons: false,
                            no_padding: true,
                            box_width: settings.width || '95%',
                            box_height: settings.height || '600px',
                            on_load: function () {

                                window.open(form ? '' : settings.url, settings.id);

                                if (form) {
                                    window.app.add_csrf_input_element(form);
                                    form.target = settings.id;
                                    form.submit();
                                }

                                $('.aol-page-iframe[name="'+settings.id+'"]').off('load.aol.page.load').on('load.aol.page.load', function () {
                                    var iframe_window = $(this)[0].contentWindow;
                                    if (iframe_window.app) {
                                        iframe_window.app.page.ui = 'box';
                                    }
                                });

                            },
                            on_close: function () {
                                if (settings.on_close) {
                                    settings.on_close();
                                }
                            }
                        });



                        break;
                }

                return module || that.open_windows[settings.id];
            };

            page.has_dock_modules = function () {
                if (window.artlogic_dock) {
                    return window.artlogic_dock.modules.length;
                } else {
                    return false;
                }
            };
            page.dock_modules = window.artlogic_dock ? window.artlogic_dock.modules : [];

            page.changed_children = function () {
                var changed_modules = window.app.utils.get_item_by_property(window.app.page.dock_modules, true, 'changed');
                return changed_modules;
            };

            page.is_docked = !!dock_module.id;
            page.title_element = '.page_title';

            /**
             *  return the opener if it exists and is from the artlogic domain.
             *  if the user has changed location in the opener, window.opener.location.href will throw a cross domain error
             *  which we catch and ignore.
             *  n.b. although this may return false instead of an object you can still call e.g. app.page.opener.browse,
             *  which will return undefined. app.page.opener.browser.another_method will throw an exception though.
             *  n.b. WILL ONLY RETURN SOMETHING for links opened via window.open or links with a target attribute.
             *  Returns null otherwise e.g. for links opened in a new tab by the user.
             *
             *  p.s. does not behave as expected when added directly to the object when defined above
             */
            Object.defineProperty(page, "opener", { get: function() {
                try {
                    if (window.opener && window.opener.location.href) {
                        return window.opener;
                    } else {
                        return false;
                    }
                } catch (e) {
                    if (e.name === 'SecurityError') {
                        return false;
                    } else {
                        throw e;
                    }
                }
            }});

            return page;

        })(),

        // deprecated (to be remove soon)
//         xpage: (function() {



//             var that = this,
//                 dock_module = window.artlogic_dock ? window.artlogic_dock.get_parent_module() || {} : {},
//                 window_methods = {
//                     close: function() {
//                         if (window.app.page.ui == 'box' && window.parent) {
//                             window.parent.app.ui.popup.close();
//                         } else {
//                             window.close();
//                         }
//                     },
//                     destroy: function() {
//                         this.close();
//                     },
//                     reload: function(post) {
//                         if (post) {
//                             // this can come in handy if we don't want
//                             // ask for user confirmation that the data
//                             // will be sent back to the server
//                             // (was happening in firefox)
//                             window.app.page.open($.extend(window.app.page.settings, {
//                                 ui: 'replace',
//                                 post_data: post,
//                                 url: window.location.href
//                             }));
//                         } else {
//                             window.location.reload();
//                         }
//                     },
//                     focus: function() {
//                         window.focus();
//                     },
//                     is_docked: !!dock_module.id

//                 },
//                 dock_module_methods = $.extend({}, dock_module);

//             delete dock_module_methods.reload;

//             var methods = $.extend({
//                 tab_icon: ''
// //                title: 'Loading'
//             }, window_methods, dock_module_methods,
//             {
//                 open_blank: function (ui) {
//                     /*
//                      * Use this when you need to open a window after running async code
//                      * (the browser will prevent opening a window using app.page.open() after
//                      * async code). Call this function before running the async code, then
//                      * call the 'open' method that this function returns after the async code.
//                      *
//                      * Example:
//                      *
//                      * var new_window = window.app.page.open_blank('tab');
//                      * window.app.request().then(function() { new_window.open({url: '/my-page'}) });
//                      *
//                      */
//                     var window_id = window.app.utils.get_uid(),
//                         new_window = window.app.page.open({
//                             url: 'about:blank',
//                             id: window_id,
//                             ui: ui,
//                         });

//                     return {
//                         open: function (options) {
//                             if (new_window.open_url) {
//                                 new_window.open_url(options);
//                             } else {
//                                 window.app.page.open($.extend({}, options, {
//                                     id: window_id,
//                                     ui: ui,
//                                 }));
//                             }
//                         }
//                     };
//                 },
//                 open: function(options) {

//                     /*
//                      * Options
//                      *
//                      * id, url, title, ui
//                      *
//                      * TODO:
//                      * needs some cleaning up, split out method for opening a browser window
//                      *
//                      */

//                     var that = this,
//                         defaults = {
//                             id: window.aui.utils.get_uid(),
//                             ui: "dock",
//                             form_method: "post"
//                         },
//                         settings = $.extend({}, defaults, options),
//                         form;

//                     if (!this.open_windows) {
//                         this.open_windows = {};
//                     }
//                     if (!this.open_window_ids) {
//                         this.open_window_ids = {};
//                     }

//                     if (settings.event) {
//                         if (settings.event.metaKey) {
//                             settings.ui = "tab";
//                         }
//                     }

//                     if (settings.post_data) {
//                         form = document.createElement("form");
//                         form.target = "page_" + settings.id;
//                         form.method = settings.form_method;
//                         form.action = settings.url;

//                         for (var property in settings.post_data) {
//                             if (settings.post_data.hasOwnProperty(property)) {
//                                 var input = document.createElement("input");
//                                 input.type = "hidden";
//                                 input.name = property;
//                                 input.value = settings.post_data[property];
//                                 form.appendChild(input);
//                             }
//                         }

//                         document.body.appendChild(form);
//                     }


//                     switch (settings.ui) {
//                         case "dock":

//                             /** warning: conf and browse not necessarily available, e.g. if in valuelist */
//                             var module_id = (window.conf ? window.conf.name : window.page_settings.tablename) + "_" + settings.id,
//                                 module = window.artlogic_dock.create_module({
//                                 id: module_id,
//                                 url: settings.url,
//                                 title: settings.title,
//                                 form: form,
//                                 on_hide: function(instance) {
//                                     window.app.page.focus();
//                                     if (instance.window && instance.window.aui) {
//                                         instance.window.aui.stickybox.close('aol-dock-menu');
//                                     }
//                                 },
//                                 on_destroy: function(module_settings, was_showing) {
//                                     window.app.utils.remove_from_array(parent.app.page.opened_list, module_id);
//                                     var page_to_open = parent.app.page.opened_list[parent.app.page.opened_list.length-1] || (parent.artlogic_dock.modules[parent.artlogic_dock.modules.length-1] || {}).id;
//                                     if (parent.artlogic_dock.modules.length && was_showing) {
//                                         parent.artlogic_dock.open_module(page_to_open, true);
//                                     }
//                                 }
//                             });
//                             if (!window.app.page.opened_list) {
//                                 window.app.page.opened_list = [];
//                             }
//                             window.app.utils.remove_from_array(parent.app.page.opened_list, module_id);
//                             window.app.page.opened_list.push(module_id);
//                             // note: for some reason setTimeout is necessary for the animation to work in ios safari
//                             setTimeout(function() {
//                                 module.open();
//                             });

//                             break;

//                         case "tab":

//                             if (that.open_windows[settings.id]) {
//                                 if (that.open_windows[settings.id].closed) {
//                                     that.open_windows[settings.id] = window.open(form ? '' : settings.url, "page_" + settings.id, settings.popup ? window_options : undefined);
//                                     that.open_window_ids[settings.id] = true;
//                                 } else {
//                                     // TODO: currently not working in IE or FF
//                                     that.open_windows[settings.id].focus();
//                                 }
//                             } else {
//                                 that.open_windows[settings.id] = window.open(form ? '' : settings.url, "page_" + settings.id, settings.popup ? window_options : undefined);
//                                 that.open_windows[settings.id].focus();
//                                 that.open_window_ids[settings.id] = true;
//                             }

//                             if (form) {
//                                 form.submit();
//                             }

//                             break;

//                         case "replace":

//                             if (form) {
//                                 form.target = "";
//                                 form.submit();
//                             } else {
//                                 window.location.href = settings.url;
//                             }

//                             break;

//                         case "window":

//                             var w = 1081,
//                                 h = window.aui.meta.window_height,
//                                 l = (screen.availWidth-w)/2,
//                                 t = ((screen.availHeight-h)/3)-40,
//                                 window_options = "width=" + w + ", height=" + h + ", top=" + t + ", left=" + l;

//                             if (that.open_windows[settings.id]) {
//                                 if (that.open_windows[settings.id].closed) {
//                                     that.open_windows[settings.id] = window.open(form ? '' : settings.url, "page_" + settings.id, window_options);
//                                     that.open_window_ids[settings.id] = true;
//                                 } else {
//                                     // TODO: currently not working in IE or FF
//                                     that.open_windows[settings.id].focus();
//                                 }
//                             } else {
//                                 that.open_windows[settings.id] = window.open(form ? '' : settings.url, "page_" + settings.id, window_options);
//                                 that.open_windows[settings.id].focus();
//                                 that.open_window_ids[settings.id] = true;
//                             }

//                             if (form) {
//                                 form.submit();
//                             }

//                             break;

//                         case "box":

//                             var iframe = "<iframe class='aol-page-iframe' name='"+settings.id+"'></iframe>",
//                                 box_id = 'app-page-open-box-' + window.app.utils.get_uid();

//                             window.app.ui.popup.load({
//                                 //id: box_id,
//                                 content: iframe,
//                                 buttons: false,
//                                 no_padding: true,
//                                 box_width: settings.width || '95%',
//                                 box_height: settings.height || '600px',
//                                 on_load: function () {
//                                     $('.aol-page-iframe[name="'+settings.id+'"]').off('load.aol.page.load').on('load.aol.page.load', function () {
//                                         var iframe_window = $(this)[0].contentWindow;
//                                         if (iframe_window.app) {
//                                             iframe_window.app.page.ui = 'box';
//                                         }
//                                     });

//                                 },
//                                 on_close: function () {
//                                     if (settings.on_close) {
//                                         settings.on_close();
//                                     }
//                                 }
//                             });

//                             window.open(form ? '' : settings.url, settings.id);

//                             if (form) {
//                                 form.target = settings.id;
//                                 form.submit();
//                             }

//                             break;
//                     }

//                     return module || that.open_windows[settings.id];
//                 }
//             });

//             methods.title_element = '#page_title';

//             methods.update = function(property, value) {
//                 var update_dock = true;

//                 switch (property) {
//                     case 'title':
//                         var value_no_html = value.replace(/<[^>]+>/g, '');
//                         document.title = value_no_html;
//                         $("title").html(window.app.page.tab_icon + value_no_html);
//                         $(window.app.page.title_element).html(value);

//                         break;
//                     case 'name':
//                         window.name = value;
//                         window.app.page.id = value;
//                 }

//                 window.app.page[property] = value;

//                 if (dock_module.update) {
//                     dock_module.update(property, value);
//                     if (window.parent.app) {
//                         window.parent.app.children_changed_handler();
//                     }
//                 }
//             };

//             methods.has_dock_modules = function() {
//                 if (window.artlogic_dock) {
//                     return window.artlogic_dock.modules.length;
//                 } else {
//                     return false;
//                 }
//             };

//             methods.dock_modules = window.artlogic_dock ? window.artlogic_dock.modules : [];

//             methods.changed_children = function() {
//                 var changed_modules = window.app.utils.get_item_by_property(window.app.page.dock_modules, true, 'changed');
//                 return changed_modules;
//             };

//             /**
//              *  return the opener if it exists and is from the artlogic domain.
//              *  if the user has changed location in the opener, window.opener.location.href will throw a cross domain error
//              *  which we catch and ignore.
//              *  n.b. although this may return false instead of an object you can still call e.g. app.page.opener.browse,
//              *  which will return undefined. app.page.opener.browser.another_method will throw an exception though.
//              *  n.b. WILL ONLY RETURN SOMETHING for links opened via window.open or links with a target attribute.
//              *  Returns null otherwise e.g. for links opened in a new tab by the user.
//              *
//              *  p.s. does not behave as expected when added directly to the object when defined above
//              */
//             Object.defineProperty(methods, "opener", { get: function() {
//                 try {
//                     if (window.opener && window.opener.location.href) {
//                         return window.opener;
//                     } else {
//                         return false;
//                     }
//                 } catch (e) {
//                     if (e.name === 'SecurityError') {
//                         return false;
//                     } else {
//                         throw e;
//                     }
//                 }
//             }});

//             return methods;

//         })(),
        children_changed_handler: function() {
            if (window.app.page.changed_children()) {
                $("body").addClass("aol-dock-modules-changed");
                window.app.set_favicon_to_changed();
            } else {
                $("body").removeClass("aol-dock-modules-changed");
                window.app.set_favicon_to_main();
            }
        },

        set_field_value: function(field_id, value) {
            $("#" + field_id).val(value);
        },

        detect_incognito_mode: function(indicator_field_id) {
            var fs = window.RequestFileSystem || window.webkitRequestFileSystem;
            if (!fs) {
              console.log("check failed?");
            } else {
              fs(window.TEMPORARY,
                 100,
                 app.set_field_value.bind(app.set_field_value, indicator_field_id, '0'),
                 app.set_field_value.bind(app.set_field_value, indicator_field_id, '1'));
            }
        },

        open_feedback_form: function() {

            app.ui.loading_box({id: "feedback-form-overlay"});

            app.request({
                url: "/" + aol_prefs.site + "/api/data/feedback/get_form",
                dataType: "html",
                method: "POST",
                success: function(result_html) {
                    aui.overlay_box.load({
                        id: "feedback-form-overlay",
                        title: "Report a problem",
                        box_width: "650px",
                        content: result_html,
                        buttons: [
                            {
                                label: "Cancel",
                                css_class: "aui-button-simple",
                                halign: "left"
                            },
                            {
                                label: "Send",
                                css_class: "aui-button-extra-round",
                                halign: "right",
                                callback: function() {

                                    if (!feedback.upload_in_progress) {
                                        var serialised_form = $("#feedback-form").serializeArray(),
                                            data = function() {

                                                var result = {};

                                                $.each(serialised_form, function(i, item) {

                                                    result[item.name] = item.value;

                                                    return;
                                                });

                                                return result;
                                            }();

                                        app.request({
                                            url: "/" + aol_prefs.site + "/api/data/feedback/send",
                                            dataType: "json",
                                            method: "POST",
                                            data: data,
                                            success: function(result) {
                                                aui.overlay_box.transform({
                                                    id: "feedback-form-overlay",
                                                    title: "Thank you for your feedback",
                                                    content: "<span>We have received an email about the issue you encountered and will be in touch shortly.</span>"
                                                }, {id: "feedback-form-overlay"});
                                            }
                                        });

                                    }
                                    return;
                                }
                            }
                        ]
                    }, {id: "feedback-form-overlay"});

                    return;
                }
            });

            return;
        },

        get_progress_bar: function(data) {
            var progress_bar_uid = h.uid32();
            var progress_bar_el_id = 'download-document-progress-bar-' + progress_bar_uid;
            var channel_id = window.page_settings.pusher_global_channel_id;
            data['_pusher_channel_id'] = channel_id;
            data['_progress_bar_uid'] = progress_bar_uid;
            console.log('pusher_channel_id: ' + channel_id);
            console.log('progress_bar_uid ' + progress_bar_uid);
            window.pusher_listener(channel_id, function(data) {
                data = h.parse_pusher_response(data);
                if (data.action == 'update_progress_bar' &&
                    data.progress_bar_uid == progress_bar_uid) {
                    console.log(data);
                    var progress_bar_el = $('#' + progress_bar_el_id);
                    $('.aui-progress-bar-message', progress_bar_el).html(data.message);
                    $('.aui-progress-bar').css('width', data.progress + '%');
                }
            });
            return progress_bar_uid;
        },

        download_document: function(get_url, data, overlay_box_html_template, overlay_box_title, overlay_box_width, overlay_box_to_close, open_overlay_and_download_doc) {

            console.log(get_url);

            var progress_bar_uid;
            data = data || {};

            if (data && data.progress_bar) {
                console.log('url: ' + get_url);
                progress_bar_uid = window.app.get_progress_bar(data);
                var loading_box_content = '<div id="download-document-progress-bar-' + progress_bar_uid + '" class="aui-progress-bar-container"><div class="aui-progress-bar-message">Preparing document...</div><div class="aui-progress-bar-track"><div class="aui-progress-bar">&nbsp;</div></div></div>';
            } else {
                var loading_box_content = '<div id="download-document-loading-' + progress_bar_uid + '" class="three-quarters">Loading...</div>';
            }

            console.log(['data:', data]);

            app.ui.loading_box({
                title: 'Creating document...',
                box_width: "350px",
                id: "creating-document-loader",
                progress_bar_uid: progress_bar_uid,
                content: loading_box_content
            });

            /* Generate a fake error here so that we can access it later,
            retrieving the origin function location for the purposes of
            logging errors.
            */
            var errorForTraceback = new Error("File download error at" + get_url);

            app.request({
                url: get_url,
                dataType: "json",
                method: "POST",
                data: data,
                success: function(result) {

                    aui.overlay_box.close(null, $("#creating-document-loader"));
                    if (!$("#file-download-iframe").length) {
                        $("body").append('<iframe id="file-download-iframe" name="file-download-iframe" class="hidden"></iframe>');
                    }
                    if (result.file_url) {
                        if (devices.handheld) {
                            // new window
                            app.ui.loading_box({
                                title: "Document created",
                                content: "Please note that the document created is time sensitive, please save or download your document immediately.",
                                box_width: "400px",
                                id: "download-document-loader",
                                buttons: [
                                    {
                                        'label': 'Download',
                                        callback: function() {
                                            window.open(result.file_url, "_blank");
                                            aui.overlay_box.close(null, $("#download-document-loader"));
                                            return;
                                        },
                                        data_attributes: {
                                            cy: "download-doc-btn",
                                        },
                                    },
                                    {
                                        'label': 'Close',
                                        callback: function(){
                                            aui.overlay_box.close(null, $("#download-document-loader"));
                                            return;
                                        },
                                        data_attributes: {
                                            cy: "close-doc-btn",
                                        },
                                    }
                                ]
                            });
                        } else if (overlay_box_html_template) {
                            // open a custom overlay box with options...
                            // we use the results of the request to pass as the data to the html template
                            // see an example of this in the activity timeline creation feedback in submit_document_settings in browse-artworks-1.0.js
                            var content = window.app.template.compile(overlay_box_html_template, result),
                                title = overlay_box_title ? overlay_box_title : '',
                                width = overlay_box_width ? overlay_box_width : "200px";
                            app.ui.loading_box({
                                title: title,
                                content: content,
                                box_width: width,
                                id: "download-document-loader",
                                buttons: [
                                    {
                                        'label': 'Close',
                                        callback: function(){
                                            aui.overlay_box.close(null, $("#download-document-loader"));
                                            if (overlay_box_to_close) {
                                                aui.overlay_box.close(null, overlay_box_to_close);
                                            }
                                            return;
                                        },
                                        data_attributes: {
                                            cy: "close-doc-btn",
                                        },
                                    }
                                ]
                            });
                            if (open_overlay_and_download_doc == true) {
                                // download the document as well as displaying the html template above...
                                // iFrame
                                window.open(result.file_url, "file-download-iframe");
                            }
                        } else {
                            // iFrame
                            window.open(result.file_url, "file-download-iframe");
                        }
                    } else {
                        var msg = "There was a problem downloading the file.";
                        if (result.error) {
                            msg += '<br>' + result.error;
                        }
                        window.h.alert('File download failed', msg);

                        // call the error handler so we log the error
                        window.handle_error(errorForTraceback);
                    }

                    return;
                }
            }).fail(function(e) {
                aui.overlay_box.close(null, $("#creating-document-loader"));
                if (e.responseText.indexOf('Row limit exceeded') > -1) {
                    aui.overlay_box.close(); // close default error alert
                    window.h.alert('Row limit exceeded', 'The number of rows in your document has exceeded the maximum allowed. Please change your query to reduce the number of rows and try again.');
                }
            });

            return;
        },

        ///////////////////////////////////
        // EVENT LISTENERS
        ///////////////////////////////////
        event_listeners: function() {
            var that = this;

            $("body").off("click.user_not_permitted").on("click.user_not_permitted", ".user_not_permitted", function() {
                h.alert("Action not allowed", "<p>Your user privileges do not allow you to perform this action.</p><p>Users are set up by your system administrator. If you need access to this function, please speak to a colleague.</p>");
                return;
            });

            $("body").off("click.fix_demo_images").on("click.fix_demo_images", ".fix-demo-images", function() {
                h.confirm({
                    title: "Are images in demo really broken?",
                    msg: "Run only in emergency, if images in the demo are *really* broken and DO NOT re-run if this doesn't fix them!",
                    callback: function() {
                        app.ui.loading_box();
                        app.request({
                            url: "/" + aol_prefs.site + "/api/data/fix-demo-images",
                            dataType: "json",
                            method: "POST",
                            success: function() {
                                aui.overlay_box.load({
                                    title: "Images in demo fixed",
                                    content: "<p>Please check the demo that the images are working. If not, please ask one of the developers.</p>",
                                    box_width: "400px"
                                })
                            }
                        });
                    }
                });

                return;
            });

            $("body").off("click.mailings_coming_soon").on("click.mailings_coming_soon", ".mailings-coming-soon", function() {

                h.alert("Mailings - Coming Soon!", '<p>The new Mailing Campaigns mechanism is not quite ready in Artlogic 3 - we\'ll be launching it very soon so watch this space. In the meantime, please send your mailings using the old system.</p><p>If you have any questions, please feel free to contact us at <a href="mailto:support@artlogic.net">support@artlogic.net</a></p>');

                return;
            });

            $("body").off("click.fix_legacy_copy_images").on("click.fix_legacy_copy_images", ".fix-legacy-copy-images", function() {

                var url = "/" + aol_prefs.site + "/api/data/artworks/fix_broken_legacy_copy_images"

                h.confirm({
                    msg: "This will re-create legacy copy images for artworks the copy images of which weren't created correctly. This may also put a significant load on the server. Run only if you know what you're doing.",
                    callback: function() {
                        app.request({
                            url: url,
                            dataType: "json",
                            method: "POST",
                            success: function(result) {

                                h.alert("Legacy copy images are being fixed", "Please check for existence of correct legacy copy images later. This operation is running in the background and may take a significant amount of time to complete.")

                                return;
                            }
                        });
                    }
                });

                return;
            });

            $("body").off("click.send_feedback").on("click.send_feedback", "#btn-send-feedback", function() {

                app.open_feedback_form();

                return;
            });

            $("body").off("click.download_document").on("click.download_document", ".file-download-clickable", function() {
                var that = $(this),
                    accounts_one_click_report = $(this).hasClass('accounts-one-click'),
                    url = $(this).data('url'),
                    text = $(this).text();

                if (accounts_one_click_report) {
                    window.app.warning_notification_on_export().done(function(){
                        window.app.log_user_action("Clicked on download document link - " + text);
                        app.download_document(url);
                    });
                } else {
                    window.app.log_user_action("Clicked on download document link - " + text);
                    app.download_document(url);
                    return;
                }
            });

            $("body").off("click.serve_document").on("click.serve_document", ".file-serve-clickable", function() {
                window.app.log_user_action("Clicked on serve document link - " + $(this).text());
                // similar to the above, but we are specificaly using the get_urls page to serve
                // documents which have already been created. The above is used more for documents which
                // need to be created...

                var doc_uid = $(this).data("uid"),
                    doc_filename = $(this).data("filename");

                if (doc_uid) {
                    window.app.request({
                        url: window.app.api_urls.get_document_urls,
                        method: 'POST',
                        data: {
                            uid: doc_uid,
                            filename: doc_filename
                        }
                    }).then(function(result) {
                        if (result.success) {
                            window.open(result.data.private_url, "file-download-iframe");
                        }
                    })
                }
                return;
            });

//            $("body").on("click", "a", function(event) {
//                if ($(this).attr("href")) {
//                    if (~$(this).attr("href").indexOf('invoice') && window.page_settings.disable_invoices_for_testing) {
//                        event.preventDefault();
//                        event.stopImmediatePropagation();
//                        that.__testing_show_message_invoices();
//                    }
//                }
//            });
            $('body').on('click.open_events_drawer', 'button.open', function(){
                //$('.header-closed').hide();
                $(this).removeClass('open')
                $('.dashboard-alert').slideDown('fast');
                $('.dashboard-alert2').slideDown('fast');
                $(this).addClass('close')
            })

            $('body').on('click.open_events_drawer', 'button.close', function(){
                $(this).removeClass('close')
                $('.dashboard-alert').slideUp('fast', function(){
                    //$('.header-closed').show();
                })
                $('.dashboard-alert2').slideUp('fast', function(){
                    //$('.header-closed').show();
                })
                $(this).addClass('open')
            })

            $("body").off("click.ad_menu_btn").on("click.ad_menu_btn", ".aol-dock-menu-button", function() {
                that.show_dock_menu($(this));
            });

            $('body').off('click.not_for_demo').on('click.not_for_demo', '.not-for-demo', function (event) {
                if (window.aol_prefs.site === "artlogiconline" && window.aol_prefs.is_authoritative) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    h.notify("This functionality isn't available in the demo. For more info, contact us at support@artlogic.net.", "Not available in demo");
                }
                return;
            });

            $('body').off('click.loader_class').on('click.loader_class', '.loader', function () {
               var that = this;
               $(that).addClass('aui-button-loading');
            //   setTimeout(function () {
            //       $(that).removeClass('aui-button-loading');
            //   }, 5000);
            });


            $("#add_narrative_note").on("click", function() {
                window.app.log_user_action("Clicked on add narrative note button");
                window.narrative.open_edit_overlay({
                    type: "contact",
                    skip_view: 1
                }, "contact");
            });

            var timer;

            $("body").off("keyup.narrative_search", "#list_search").on("keyup.narrative_search", "#list_search", function() {

                if (timer) {
                    clearTimeout(timer);
                }

                var tablename = page_settings.tablename || conf.name,
                    narrative_type = tablename.substr(0, tablename.length - 1),
                    search_string = $(this).val(),
                    debounced_narrative_render = function() {
                        narrative.render(narrative_type, $("#narrative_subject_id").val(), search_string);
                    };

                timer = setTimeout(debounced_narrative_render, 300);

                return;
            });

            $("body").on("change", ".location-select", function() {
                var sns_instance_id = $(this).attr("id"),
                    sns_instance = sns.instances[sns_instance_id],
                    location2_sns_instance_id = sns_instance.location_detail_field_id,
                    location2_sns_instance = sns.instances[location2_sns_instance_id];

                if (location2_sns_instance) {
                    location2_sns_instance.params = {
                        location: $(this).val(),
                        location_id: sns_instance_id === "f_location" ? $("#f_location_id").val() : (window.edit ? edit.fieldvalue("artworks", "location_id") : $("#f_location_id").val()),
                        locationContactID: sns_instance_id === "f_location" ? $("#f_locationContactID").val() : (window.edit ? edit.fieldvalue("artworks", "locationContactID") : $("#f_locationContactID").val())
                    }
                }
            });

            $("#aol-close-window").click(function() {
                window.app.win.close();
            });

            $(".aol-close-page").click(function() {
                window.app.page.close();
            });

            $(document).on("meta_key", function() {
                $("body").addClass("meta-key-pressed");
            });

            $(document).on("keyup", function() {
                $("body").removeClass("meta-key-pressed");
            });

            $(window).on("focus", function(event) {
                if (!event.metaKey) {
                    $("body").removeClass("meta-key-pressed");
                }
            });

            $('a.aui-nav-item').click(function (event) {
                if ($(this).hasClass('disabled')) {
                    // do nothing...
                    event.preventDefault();
                } else {
                    var url = $(this).attr('href');
                    if (window.app.page.changed_children() && url !== '#' && url != 'javascript:void(0)') {
                        event.preventDefault();
                        window.app.page.open({
                            url: url,
                            ui: 'tab'
                        });
                    }
                }
            });

            $('.main-menu-item.disabled a.main-menu-btn').click(function (event) {
                event.preventDefault();
                if ($(this).parent().hasClass('contacts')) {
                    window.upsell_details.display_upsell('general');
                } else if ($(this).parent().hasClass('invoices')) {
                    window.upsell_details.display_upsell('accounts');
                } else if ($(this).parent().hasClass('library')) {
                    window.upsell_details.display_upsell('general');
                } else if ($(this).parent().hasClass('privateviews')) {
                    window.upsell_details.display_upsell('general');
                } else {
                    window.upsell_details.display_upsell('general');
                }
            });

            $(".aol-main-menu-btn").click(function() {
                window.aui.pane.load({
                    content: $("#aui-mobile-nav").html(),
                    //animation: "push",
                    squeeze_content: false,
                    position: "right",
                    box_width: '300px',
                    css_class: "aol-menu-panel",
                    no_padding: true,
                    //close_button: true,
                    buttons: false,
                    animation: "slide-left", //"slide-left-bounce",
                    animation_speed_in: 300,
                    animation_speed_out: 600,
                    on_load: function () {
                        $("body").addClass("aol-mobile-menu-active");
                    },
                    on_before_close: function () {
                        $("body").removeClass("aol-mobile-menu-active");
                    }
                });
            });

            $(".aol-toggle-safe-mode").off("click.safe_mode").on("click.safe_mode", function() {
                if (!$(this).hasClass("active")) {
                    $(this).addClass("active");
                    $(this).find(".onoff-switch-track").addClass("on");
                    $("body").addClass("aol-safe-mode");
                    window.app.safe_mode = true;
                } else {
                    $(this).removeClass("active");
                    $(this).find(".onoff-switch-track").removeClass("on");
                    $("body").removeClass("aol-safe-mode");
                    window.app.safe_mode = false;
                }

                window.app.local_storage.set_item("app_safe_mode", window.app.safe_mode);
            });

            $(".aol-open-externally").on("click", function() {
                var content = "<ul class='stickybox-menu'><li><button class='aol-open-externally-tab'>Open this page in new tab</button></li><li><button class='aol-open-externally-window'>Open this page in new window</button></li></ul>";
                if (true) {
                    $(this).stickyBox(content, {
                        width: 240,
                        fixed: true,
                        on_load: function() {
                            $(".aol-open-externally-tab")
                                .off("click.aol-external")
                                .on("click.aol-external", function() {
                                    confirm_save("tab");
                            });

                            $(".aol-open-externally-window")
                                .off("click.aol-external")
                                .on("click.aol-external", function() {
                                    confirm_save("window");
                            });

                            function confirm_save(ui) {
                                /* To prevent a page alerting you that you have unsaved changes on close,
                                * add the following line within your '$(document).ready(...)' block:
                                *
                                *     window.app.page.allow_close_without_saving = true;
                                *
                                * You may wish to do this on utility pages (e.g. 'Email selected
                                * artworks').
                                */

                                var url = window.location.pathname + window.location.search.replace(/&?docked=[^&]+/, '');
                                if ((window.app.page.changed && window.edit) && !window.app.page.allow_close_without_saving) {
                                    window.aui.overlay_box.load({
                                        title: "You have unsaved changes",
                                        content: "<p>You need to save this record in order to proceed. Would you like to save and proceed?</p>",
                                        buttons: [
                                            {
                                                label: "Cancel",
                                                css_class: "aui-button-simple",
                                                halign: "right"
                                            },
                                            {
                                                label: "Save changes",
                                                halign: "right",
                                                callback: function() {
                                                    var page = open_page(ui, '');

                                                    if (window.aol_prefs.site === "artlogiconline") {
                                                        window.h.prevent_action_on_demo();
                                                        return;
                                                    };

                                                    // show loading animation
                                                    window.app.ui.loading_box({
                                                        title: 'Saving record...'
                                                    });

                                                    // save record
                                                    window.edit.save_record().done(function() {
                                                        window.app.page.destroy();
                                                        page.location = url;
                                                    });
                                                }
                                            }
                                        ]
                                    });
                                } else {
                                    open_page(ui, url);
                                    window.app.page.destroy();
                                }
                            }

                            function open_page(ui, url) {

                                var page = parent.app.page.open({
                                    id: window.app.page.id,
                                    url: url,
                                    title: window.app.page.title,
                                    ui: ui || "tab",
                                    post_data: window.app.page.post_data
                                });

                                return page
                            }
                        }
                    });
                }
            });

            $("body").on("click", ".f-info-button, .f-info-button-large", function() {
                var elem = $(this);
                var content_id = elem.data('content_id') || '#' + elem.attr('id') + '_txt';
                var box_width = elem.data('box_width');
                var content = $(content_id).html();
                var title = elem.data('box_heading') || undefined;

                if ((elem.hasClass('sticky') || elem.closest(".aui-overlay-box").length) && !elem.hasClass("box")) {
                    elem.stickyBox(content, {
                        position: elem.data('position') || "right",
                        valign: "middle",
                        width: box_width || "350px",
                        z_index: 1300,
                        padding: '20px'
                    });
                } else {
                    aui.overlay_box.load({
                        id: "info_box",
                        content: content,
                        title: title,
                        title_class: "f-info-heading popup-header",
                        box_width: box_width || 440,
                        button_align: "right"
                    });
                }
            });

            $(".aol-dock-module-close").click(function() {
                /* To prevent a page alerting you that you have unsaved changes on close,
                * add the following line within your '$(document).ready(...)' block:
                *
                *     window.app.page.allow_close_without_saving = true;
                *
                * You may wish to do this on utility pages (e.g. 'Email selected
                * artworks').
                */
                if (window.app.page.override_default_close_module) {
                    // Use the below logic in your standard page to override the default close module behaviour
                    return;
                }
                window.app.log_user_action('Clicked on dock module close button');
                if ((window.app.page.changed && window.edit) && !window.app.page.allow_close_without_saving) {
                    window.aui.overlay_box.load({
                        title: "You have unsaved changes",
                        content: "If you close this page without saving you will lose all unsaved changes",
                        buttons: [
                            {
                                label: "Cancel",
                                css_class: "aui-button-simple",
                                halign: "left",
                                data_attributes: {
                                    cy: "dock-unsaved-cancel-btn",
                                },
                            },
                            {
                                label: "Close without saving",
                                css_class: "aui-button-simple",
                                halign: "right",
                                callback: function() {
                                    // save and close record
                                    window.app.page.destroy();
                                },
                                data_attributes: {
                                    cy: "dock-unsaved-close-btn",
                                },
                            },
                            {
                                label: "Save changes",
                                halign: "right",
                                callback: function() {
                                    if (window.aol_prefs.site === "artlogiconline") {
                                        window.h.prevent_action_on_demo();
                                        return;
                                    };
                                    // save and close record
                                    window.app.ui.loading_box({
                                        title: 'Saving record...'
                                    });
                                    if (window.app.page.dock_module_save_and_close) {
                                        window.app.page.dock_module_save_and_close().then(function() {
                                            window.app.page.destroy();
                                        });
                                    } else {
                                        window.edit.save_record().then(function() {
                                            window.app.page.destroy();
                                        });
                                    }
                                },
                                data_attributes: {
                                    cy: "dock-unsaved-save-btn",
                                },
                            }
                        ]
                    });
                } else {
                    window.app.page.destroy();
                }
            });

            $("body").on("click", ".aui-nav-item-setup-two-factor-authentication a", function() {

                passwords.open_two_factor_auth_setup_overlay(true);

                return;
            });

            $("body").on("click", ".aui-nav-item-setup-another-device-for-2fa a", function() {

                passwords.open_two_factor_auth_setup_overlay(true, "setup_new_device");

                return;
            });

            $("body").on("click", ".aui-nav-item-user-details a", function() {
                //get current user names and email address to populate update form
                window.app.request({
                    url: "/" + aol_prefs.site + "/api/data/users/user_details/get/",
                    dataType: "json",
                    method: "POST",
                    success: function(result) {
                        //build and display template with form and fields populated
                        var user_details_fields_source = $("#user_details_fields_template").html(),
                            old_email = result.email,
                            template = Handlebars.compile(user_details_fields_source),
                            content = template(result);

                        aui.overlay_box.load({
                            content: content,
                            box_width: 500,
                            callback: function() {
                                //event handler to display email notification field
                                $("#btn_override_email_address_for_notifications").on("click", function() {
                                    $("#f_email_address_for_notifications").prop("disabled", false);
                                    $(this).remove();
                                });
                            },
                            buttons: [
                                {
                                    label: "Cancel",
                                    css_class: "aui-button-simple",
                                    halign: "left"
                                },
                                {
                                    label: "Save",
                                    css_class: "aui-button-extra-round update-user-button",
                                    halign: "right",
                                    callback: function() {
                                        var button = $('button.update-user-button'),
                                            first_names = $("#f_user_first_name").val() || '',
                                            last_name = $("#f_user_last_name").val() || '',
                                            email = $("#f_email_address").val() || '',
                                            email_address_for_notifications = $("#f_email_address_for_notifications").val() || '',
                                            email_valid = that.check_email(email, old_email).email_valid,
                                            invalid_reason = that.check_email(email, old_email).invalid_reason;

                                        if (!email_valid) {
                                            // if email not valid display sticky box at the update user button
                                            var error_msg = '<b>Username/email is not valid. </b>' + invalid_reason + '<br>Please input the user\'s email.';
                                            button.stickyBox('<div style="padding: 15px;">' + error_msg + '</div>', {width: "250px"});

                                        } else {
                                            ///if email address is valid update the user entry names and email
                                            window.app.request({
                                                url: "/" + aol_prefs.site + "/api/data/users/user_details/set/",
                                                dataType: "json",
                                                method: "POST",
                                                data: {
                                                    'first_names': first_names,
                                                    'last_name': last_name,
                                                    'email': email,
                                                    'email_address_for_notifications': email_address_for_notifications
                                                },
                                                success: function(result) {
                                                    //success message
                                                    aui.overlay_box.load({
                                                        content: "<div>User details successfuly updated.</div>"
                                                    });
                                                }
                                            });
                                        }

                                    }
                                }
                            ]
                        });
                    }
                });

            });

            $("body").on("click", ".aui-nav-item-change-password a", function() {

                var password_fields_source = $("#change_password_fields_template").html();

                var template = Handlebars.compile(password_fields_source),
                    content = template();

                aui.overlay_box.load({
                    content: content,
                    callback: function() {

                        passwords.init("#f_new_password", "#f_verify_password");

                        return;
                    },
                    buttons: [
                        {
                            label: "Cancel",
                            css_class: "aui-button-simple",
                            halign: "left"
                        },
                        {
                            label: "Change password",
                            css_class: "aui-button-extra-round",
                            halign: "right",
                            callback: function() {

                                var button = $("#aui-overlay-box-button-" + $(this)[0].id),
                                    old_password = $("#f_old_password").val(),
                                    new_password = $("#f_new_password").val(),
                                    verify_password = $("#f_verify_password").val();

                                if (old_password !== "") {
                                    if (old_password !== new_password) {
                                        if (new_password === verify_password) {
                                            if (passwords.check_password_strength(new_password).pass) {

                                                window.app.request({
                                                    url: "/" + aol_prefs.site + "/api/data/users/change_password/",
                                                    dataType: "json",
                                                    method: "POST",
                                                    data: {
                                                        old_password: old_password,
                                                        new_password: new_password,
                                                        verify_password: verify_password
                                                    },
                                                    success: function(result) {

                                                        var content = (function() {
                                                            if (result.success) {
                                                                return "<div>Password changed successfully.</div>";
                                                            }

                                                            else if (result.error && result.error === "User role") {
                                                                return "<div style='max-width: 290px'>Your user settings don’t allow access to this. Please contact an account Admin user to update your privileges or change your password.</div>"
                                                            }
                                                            else if (result.error) {
                                                                return "<div>Some error occured, please contact your administrator.</div>";
                                                            }

                                                            return "<div>Some error occured, please contact your administrator.</div>";
                                                        })()

                                                        aui.overlay_box.load({
                                                            content: content
                                                        });

                                                        return;
                                                    }
                                                });

                                            }
                                            else {
                                                button.stickyBox('<div style="padding: 15px;"><b>Password is not strong enough.</b><br>Please, try again.</div>', {width: "222px", height: "72px", position: "top"});
                                            }
                                        }
                                        else {
                                            button.stickyBox('<div style="padding: 15px;"><b>Passwords do not match.</b><br>Please, try again.</div>', {width: "185px", height: "72px", position: "top"});
                                        }
                                    }
                                    else {
                                        button.stickyBox('<div style="padding: 15px;"><b>The new password can\'t be the same as the old one.</b></div>', {width: "196px", height: "72px", position: "top"});
                                    }
                                }
                                else {
                                    button.stickyBox('<div style="padding: 15px;"><b>The old password field has to be filled in.</b></div>', {width: "172px", height: "72px", position: "top"});
                                }

                                return;
                            }
                        }
                    ]
                });

                return;
            });

            // Listener triggered when the 2FA settings option in the users menu in the toolbar is selected
            $("body").on("click", ".aui-nav-item-two-factor-authentication", function() {
                window.app.request({
                    url: "/" + aol_prefs.site + "/records/users/get_2fa_configuration",
                    method: 'POST',
                    data: {
                        'user_id': window.page_settings.user.id,
                    },
                    success: function (r) {
                        if (r['success'] === true) {
                            const enforced_2fa = r['enforced_2fa']
                            const two_factor_auth_enabled = r['two_factor_auth_enabled'];
                            const otp_method_original = r['otp_method'];
                            const email = r['email'];
                            const has_existing_auth_app = r['two_factor_auth_resource_id'] !== '';
                            var two_factor_authentication_source_template  = $("#two_factor_authentication_settings_template").html();
                            var template = Handlebars.compile(two_factor_authentication_source_template),
                                content = template({ enforced_2fa, two_factor_auth_enabled, otp_method_original, email, has_existing_auth_app });

                            aui.overlay_box.load({
                                content,
                                box_width: '500px',
                                callback: function () {
                                    // set mode to email if none is selected
                                    if (otp_method_original == '') {
                                        $('#otp_method-email').click()
                                    }

                                    $('.btn_toggle_two_factor_auth').on('click', function() {
                                        setTimeout(function() {
                                            const is_toggle_on = Boolean($('.btn_toggle_two_factor_auth').find('.on').length);
                                            if (is_toggle_on) {
                                                $("#two_factor_radios").css('display', 'block');
                                            } else {
                                                $("#two_factor_radios").css('display', 'none');
                                            }
                                        })
                                    })

                                    $('#btn_setup_first_device').on('click', function() {
                                        window.passwords.open_two_factor_auth_setup_overlay(false, null, function() {
                                            $('#authenticator_app_radio_container').css('display', 'block');
                                            $('#otp_method-auth_app').click();
                                        });
                                    })

                                    $("#btn_setup_new_device").on("click", function() {
                                        window.passwords.open_two_factor_auth_setup_overlay(false, "setup_new_device");
                                    });
                                },
                                buttons: [
                                    {
                                        label: "Cancel",
                                        css_class: "aui-button-simple",
                                        halign: "left"
                                    },
                                    {
                                        label: "Update",
                                        css_class: "aui-button-extra-round",
                                        halign: "right",
                                        callback: function() {
                                            const two_factor_auth_enabled = Boolean($('.btn_toggle_two_factor_auth').find('.on').length);
                                            const otp_method_new = $($("#two_factor_radios").find(":checked")[0]).val();
                                            window.app.ui.loading_box();

                                            window.app.request({
                                                url: "/" + aol_prefs.site + "/api/data/users/set_two_factor_auth_settings/",
                                                dataType: "json",
                                                method: "POST",
                                                data: {
                                                    two_factor_auth_enabled: two_factor_auth_enabled ? 1 : 0,
                                                    otp_method_new,
                                                    otp_method_original,
                                                    user_id: window.page_settings.user.id
                                                },
                                                success: function(result) {
                                                    if (result.success) {
                                                        aui.overlay_box.load({
                                                            content: '<div> <h1> Update user settings </h1> Changes successfully saved. </div>'
                                                        });
                                                    }
                                                },
                                            })
                                        }
                                    }
                                ]
                            })
                        } else {
                            window.h.alert('There has been a problem loading your data. If the problem persists please contact support@artlogic.net');
                        }
                    }
                });
            })

            $(".set_invoice_gallery").on('click', function() {
                window.app.select_invoice_gallery();
            });

            $('body').on('change', '#invoice-select-gallery', function() {
                window.app.set_invoice_gallery($(this));
            });

            $('.not-for-magic-users').click(function (event) {
                event.stopPropagation();
                window.h.alert('Not available', 'This feature won\'t work for magic users, sorry.');
            });

            $("body").on('click', '.app-link-tab', function(event) {
                event.preventDefault();
                that.open_link(this, {
                    ui: 'tab',
                    event: event
                });
            });

            $("body").on('click', '.app-link-dock', function(event) {
                event.preventDefault();
                that.open_link(this, {
                    ui: 'dock',
                    event: event
                });
            });

            $("body").on('click', '.app-link-dock-same', function(event) {
                /** if linked from a page already in a dock, this will open a new page in the same dock
                    - a conf string can be passed in for the window id
                    nb the page's opener will be the parent of the dock, not the original docked page.
                */
                event.preventDefault();
                that.open_link(this, {
                    ui: 'dock_parent',
                    conf: $(this).data('conf'),
                    event: event
                });
            });


            $("body").on("click", ".link-open-tab", function(event) {
                event.preventDefault();
                that.open_link(this, {
                    ui: 'dock',
                    event: event
                });

                // TODO: rename class to 'app-link-dock'
//                event.preventDefault();
//
//                var id = $(this).data("id") || aui.utils.get_uid(),
//                    url = $(this).attr("href"),
//                    popup = $(this).attr("data-popup") || false,
//                    title = $(this).attr("data-title") || false,
//                    confirm = $(this).data('confirm') || false,
//                    alrt = $(this).data('alert') || false;
//
//                 if (alrt) {
//                     window.h.alert(alrt);
//                 } else if (confirm) {
//                     var confirmed = window.h.confirm({msg: confirm});
//                     confirmed.done(function() {
//                         window.app.page.open({
//                             id: id,
//                             url: url,
//                             title: title,
//                             ui: "dock",
//                             event: event
//                         });
//                     });
//                 } else {
//                     window.app.page.open({
//                         id: id,
//                         url: url,
//                         title: title,
//                         ui: "dock",
//                         event: event
//                     });
//                 }

            });


            $('body').on('click', '.aol-sticky-link-list', function (event) {
                var links = $(this).data('links'),
                    template = '<div><ul class="stickybox-menu">{{#each links}}<li><a href="{{url}}">{{label}}</a></li>{{/each}}</ul></div>',
                    html = window.app.template.compile(template, {links: links});

                $(this).stickyBox(html, {
                    width: '200px'
                });
            });

            // easy way of opening a popup from a button
            $('body').on('click', '.aol-click-popup-content', function (event) {
                var title = $(this).data('title'),
                    content = $(this).data('content'),
                    width = $(this).data('width'),
                    show_close_button = $(this).data('show-close-button') || false,
                    custom_css_class = $(this).data('custom-css-class') || '';

                window.app.ui.popup.load({
                    title: title,
                    content: content,
                    box_width: width,
                    show_close_button: show_close_button,
                    css_class: custom_css_class,
                });
            });

            $('body').on('click', '.dev-banner-close-btn', function() {

                window.app.dev_banner.hide();

            });

            $('body').on('click', '.member-gallery-details-btn', function(e, args) {
                // On Event-connected databases, this button should be available across the system
                // this will redirect to core preferences as a full page...
                // window.location.href = "/" + window.app.state.site + '/admin/preferences/core_preferences#gallery'
                // this will open up in a side panel (makes more sense to keep them on the page they're working on, don't have to click back)
                var user_can_edit_gallery_details = window.page_settings.user.is_gallery_details_admin ? window.page_settings.user.is_gallery_details_admin : false;
                var ui_open = e.target["dataset"]["ui_open"] ? e.target["dataset"]["ui_open"] : "window";
                if (user_can_edit_gallery_details) {
                    window.app.page.open({
                        url: "/" + window.app.state.site + '/admin/preferences/core_preferences#gallery-details',
                        ui: ui_open
                    });
                } else {
                    // not permitted
                    window.h.alert(
                        'Editing gallery details not permitted',
                        'Editing gallery details requires \'admin\' user privileges.<br><br>If you need access to this function, please speak to a colleague with the relevant permissions.'
                    );
                }
            });

            $('body').on('click', '.member-event-artworks-btn', function(e, args) {
                // On Event-connected databases, this button should be available across the system
                // Note when this class is used, requires the addition of a markup data-event="{{event_id}}"
                // with event_id being the org and event i.d. e.g. fiac_spring_2021
                var pv_selected_works = e.target["dataset"]["selectedworks"],
                    url = window.aol_prefs.path_to_records + 'artworks/all/';
                window.app.page.open({
                            url: url,
                            ui: 'window',
                            post_data: {
                                ids: pv_selected_works
                            }
                        });
            });

            $('body').on('click', '.member-event-view-artworks-btn', function(e, args) {
                // On Event-connected databases, this button should be available across the system
                // It will check whether any artworks have been shared with an event and either redirect
                // to that view of artworks of pop-up and overlay to say that artworks have not been shared yet
                // Note: when this class is used it required the addidtion of `data-event="[event_id]"` e.g.
                // `data-event="fiac_spring_2021"`
                var event_id = e.target["dataset"]["event"],
                    ui_open = e.target["dataset"]["uiview"] ? e.target["dataset"]["uiview"] : "replace";

                if (event_id) {
                    window.app.api_request({
                        endpoint: 'private_view_check_shared_w_event',
                        method: 'POST',
                        data: {
                            shared_to_member_organisation_website: event_id,
                        }
                    }).then(function (result) {
                        if (result) {
                            var redirect_to_artworks_view_url = window.aol_prefs.urls.aol_site_root + "/records/artworks/shared_to_event/" + event_id + "/";
                            if (window.location.href.indexOf(redirect_to_artworks_view_url) === -1) {
                                window.app.page.open({ui: ui_open, url: redirect_to_artworks_view_url});
                            } else {
                                window.aui.overlay_box.close();
                            }
                        } else {
                            window.app.mem_event_artworks_unshared(event_id)
                        };
                    });
                };
            })

            $('body').off('click.preview-member-event-url').on('click.preview-member-event-url', '.member-event-preview', function(e) {
                /*
                    The button on event page list screen to 'preview' on the live site.
                    Note - located here to avoid any issues of the event handlers loading
                    out of order (and the button not working) - seems more generally reliable
                    when this function stays on main-1.0.js

                */
                if ($(this).hasClass('disabled')) {
                    var html = '<div class="pr10 pl10 mb10 mt10">Preview coming soon</div>';
                    $(this).stickyBox(html, {
                        width: '150px'
                    });
                } else {
                    if ($(this).data('preview_url')) {
                        window.app.page.open({url: $(this).data('preview_url'), ui: 'tab'});
                    }
                }
            });

            $('body').on('click', '.member-event-pv-btn', function(e, args) {
                // On Event-connected databases, this button should be available across the system
                // Note when this class is used, requires the addition of a markup data-event="{{event_id}}"
                // with event_id being the org and event i.d. e.g. fiac_spring_2021
                var event_pv_id = e.target["dataset"]["pvid"];
                if (event_pv_id) {
                    var redirect_to_pv_url = window.aol_prefs.urls.aol_site_root + "/records/private_views/edit/" + event_pv_id + "/";
                    if (window.location.href.indexOf(redirect_to_pv_url) === -1) {
                        window.app.page.open({ui: 'tab', url: redirect_to_pv_url});
                    } else {
                        window.aui.overlay_box.close();
                    }
                } else {
                    var event_id = e.target["dataset"]["event"];
                    if (event_id) {
                        window.app.api_request({
                            endpoint: 'private_view_check_shared_w_event',
                            method: 'POST',
                            data: {
                                shared_to_member_organisation_website: event_id,
                            }
                        }).then(function (result) {
                            if (result) {
                                event_pv_id = result['rec_id'];
                                var redirect_to_pv_url = window.aol_prefs.urls.aol_site_root + "/records/private_views/edit/" + event_pv_id + "/";
                                if (window.location.href.indexOf(redirect_to_pv_url) === -1) {
                                    window.app.page.open({ui: 'tab', url: redirect_to_pv_url});
                                } else {
                                    window.aui.overlay_box.close();
                                }
                            } else {
                                window.app.mem_event_artworks_unshared(event_id)
                            };
                        });
                    };
                }
            });

            $('body').on('change', '.check_numeric', function() {
                window.app.check_numeric($(this));
            });

            $('body').on('change', '.check_int', function() {
                window.app.check_int($(this));
            });

            window.app.events.set_keyboard_shortcuts(this.events.keyboard_shortcuts);

        },

        validate_temp_password: function() {
            var that = this
            /*
                note 10/03/2022 - This portion of code checks if a user logging in has a valid email address.
                If not, it prompts them to enter a new one. This section has been commented out as it's not being
                implemented yet, but is being left in for a future implementation when needed.
                if (!emailRegex.test(window.page_settings.user.email)) {
                    app.template.change_temporary_password.then(function() {
                        var template = window.app.template.get('set_valid_email')
                        var content = template()
                        aui.overlay_box.load({
                            content: content,
                            close_on_click_outside: false,
                            box_width: '441px',
                            callback: function() {},
                            buttons: [
                                {
                                    label: "Set email",
                                    css_class: "aui-button-extra-round",
                                    halign: "right",
                                    callback: function() {
                                        var button = $("#aui-overlay-box-button-" + $(this)[0].id),
                                            new_email = $("#f_email").val(),
                                            verify_email = $("#f_verify_email").val()

                                        if (new_email === verify_email) {
                                            if (emailRegex.test(new_email)) {
                                                console.log("valid email")
                                                window.app.request({
                                                    url: "/" + aol_prefs.site + "/api/data/users/set_valid_email/",
                                                    dataType: "json",
                                                    method: "POST",
                                                    data: {
                                                        new_email: new_email,
                                                        verify_email: verify_email
                                                    },
                                                    success: function(result) {
                                                        var content = (function() {
                                                            if (result.success) {
                                                                return "<div>Email set successfully.</div>";
                                                            }
                                                            else if (result.error) {
                                                                return "<div>Some error occured, please contact your administrator.</div>";
                                                            }

                                                            return "<div>Some error occured, please contact your administrator.</div>";
                                                        })()

                                                        aui.overlay_box.load({
                                                            content: content
                                                        });

                                                        return;
                                                    }
                                                })
                                            } else {
                                                button.stickyBox('<div style="padding: 15px;"><b>Entered value is not a valid email.</b><br>Please, try again.</div>', {width: "222px", height: "100x", position: "top"});
                                            }
                                        } else {
                                            button.stickyBox('<div style="padding: 15px;"><b>Entered values do not match.</b><br>Please, try again.</div>', {width: "185px", height: "100px", position: "top"});
                                        }
                                    }
                                }
                            ]
                        })
                    })
                }
            */

            if (window.aol_prefs.is_temporary_password ==  true) {
                app.template.change_temporary_password.then(function() {
                    var has_valid_email = that.check_email(window.page_settings.user.email).email_valid
                    var template = window.app.template.get('change_temporary_password_template')
                    var content = template({has_valid_email: has_valid_email});

                    aui.overlay_box.load({
                        content: content,
                        close_on_click_outside: false,
                        box_width: '441px',
                        callback: function() {
                            passwords.init("#f_new_password", "#f_verify_password");
                            var is_entered_value_valid_email = false;
                            var invalid_reason = ''

                            $("#f_email").on('input', function(e) {
                                is_entered_value_valid_email = that.check_email($("#f_email").val()).email_valid
                                invalid_reason = that.check_email($("#f_email").val()).invalid_reason;

                                if (is_entered_value_valid_email) {
                                    $("#f_email_icon").removeClass("fa-exclamation-triangle").addClass("fa-check").css("color", "green");
                                } else {
                                    $("#f_email_icon").removeClass("fa-check").addClass("fa-exclamation-triangle").css("color", "red");
                                }
                            })

                            $("#f_email_icon").hover(
                                function() {
                                    if (!is_entered_value_valid_email) {
                                        var error_msg = '<b>Username/email is not valid. </b>' + invalid_reason + '<br>Please input the user\'s email.';
                                        $("#f_email_icon").stickyBox('<div style="padding: 15px;">' + error_msg + '</div>', {width: "250px"});
                                    }
                                },
                                function() {
                                    if (!is_entered_value_valid_email) {
                                        setTimeout(function() {
                                            window.aui.close_stickybox();
                                        }, 100);
                                    }
                                }
                            )

                            return;
                        },
                        buttons: [
                            {
                                label: has_valid_email ? "Change password" : "Update values",
                                css_class: "aui-button-extra-round",
                                halign: "right",
                                callback: function() {

                                    var button = $("#aui-overlay-box-button-" + $(this)[0].id),
                                        new_password = $("#f_new_password").val(),
                                        verify_password = $("#f_verify_password").val(),
                                        new_email = $("#f_email").val()

                                        if (new_password === verify_password) {
                                            if (passwords.check_password_strength(new_password).pass) {
                                                var data = {
                                                    new_password: new_password,
                                                    verify_password: verify_password
                                                }

                                                if (!has_valid_email) {
                                                    if (that.check_email(new_email).email_valid) {
                                                        data.new_email = new_email;
                                                    } else {
                                                        button.stickyBox('<div style="padding: 15px;"><b>Not a valid email.</b><br>Please, try again.</div>', {width: "185px", height: "75px", position: "top"});
                                                        return
                                                    }
                                                }

                                                window.app.request({
                                                    url: "/" + aol_prefs.site + "/api/data/users/change_password/",
                                                    dataType: "json",
                                                    method: "POST",
                                                    data: data,
                                                    success: function(result) {
                                                        var content = (function() {
                                                            if (result.success) {
                                                                if (has_valid_email) {
                                                                    return '<div">Password changed successfully.</div>';
                                                                } else {
                                                                    return '<div">Email and password changed successfully.</div>';
                                                                }
                                                            }
                                                            else if (result.error) {
                                                                return "<div>Some error occured, please contact your administrator.</div>";
                                                            }

                                                            return "<div>Some error occured, please contact your administrator.</div>";
                                                        })()

                                                        aui.overlay_box.load({
                                                            content: content,
                                                            callback: function (e) {
                                                                $("button[class*='aui-overlay-box-button']").on('click', function() {
                                                                    location.reload()
                                                                })
                                                            }
                                                        });

                                                        return;
                                                    }
                                                });

                                            }
                                            else {
                                                button.stickyBox('<div style="padding: 15px;"><b>Password is not strong enough.</b><br>Please, try again.</div>', {width: "222px", height: "72px", position: "top"});
                                            }
                                        }
                                        else {
                                            button.stickyBox('<div style="padding: 15px;"><b>Passwords do not match.</b><br>Please, try again.</div>', {width: "185px", height: "72px", position: "top"});
                                        }

                                    return;
                                }
                            }
                        ]
                    });
                });
            }
        },

        check_email: function(new_email, old_email) {
            var email_regex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
                email_valid = true,
                invalid_reason = '';

            if (new_email != old_email) {
                //check if email is blank
                if (new_email == "") {
                    email_valid = false;
                }
                //check if email is valid email string
                if (!RegExp(email_regex).test(new_email)) {
                    email_valid = false;
                }
                //check email contains artlogic
                if (new_email.indexOf("artlogic") !== -1) {
                    if (aol_prefs.site == "artlogic") {
                        email_valid = email_valid;
                    } else {
                        email_valid = false;
                        invalid_reason = "Username cannot contain 'artlogic'";
                    }
                }
            }
            return {
                'email_valid': email_valid,
                'invalid_reason': invalid_reason
            };
        },

        open_link: function (element, options) {
            var id = $(element).data("id") || window.aui.utils.get_uid(),
                url = $(element).attr("href"),
                popup = $(element).attr("data-popup") || false,
                title = $(element).attr("data-title") || false,
                confirm = $(element).data('confirm') || false,
                alrt = $(element).data('alert') || false,
                ui = $(element).data('window-type') || 'dock',
                post_data = $(element).data('post-data') || undefined,
                post_data_to_send = post_data ? JSON.stringify(post_data) : undefined,
                settings = $.extend({
                    id: id,
                    url: url,
                    title: title,
                    ui: ui,
                    post_data: post_data
                }, options);

            if (alrt) {
                window.h.alert(alrt);
            } else if (confirm) {
                var confirmed = window.h.confirm({msg: confirm});
                confirmed.done(function() {
                    window.app.page.open(settings);
                });
            } else {
                window.app.page.open(settings);
            }
        },

        /**
         *  Add a warning note if user enters non-numeric data e.g. '2,500'
         */
        check_numeric: function(elem) {
            const negative_ok = elem.hasClass('negative_ok') || window.edit?.fieldvalue("accounts", "invoiceStatus") === 'creditnote';
            const validation_level = elem.hasClass('check_numeric_warning') ? 'warning' : 'error';
            const note = elem.attr('data-validation-msg') || 
                "Please enter a" + (negative_ok ? "" : " positive") + " numeric value containing only digits and an optional decimal point (.)";

            if (isNaN(elem.val()) || (!negative_ok && elem.val() < 0)) {
                this.numeric_error_message(elem, false, note, validation_level);
            } else {
                this.numeric_error_message(elem, true, note, validation_level);
            }
        },

        check_int: function(elem) {
            var value = elem.val();
            var error = false;
            
            const negative_ok = elem.hasClass('negative_ok') || window.edit?.fieldvalue("accounts", "invoiceStatus") === 'creditnote';
            const validation_level = elem.hasClass('check_int_warning') ? 'warning' : 'error';
            const note = elem.attr('data-validation-msg') || "Please enter " + (negative_ok ? "an" : "a positive") + " integer.";

            if(typeof value !== 'number') {
                if (negative_ok) {
                    if (!/^-?\d+$/.test(value)) {
                        error = true;
                    }
                } else {
                    if (value.match(/[^0-9]/)) {
                        error = true;
                    }
                }
            }
            if ((value % 1) !== 0) {
                error = true;
            }

            this.numeric_error_message(elem, !error, note, validation_level);
        },

        numeric_error_message: function(elem, remove, note, validation_level) {
            const level = validation_level === 'warning' ? 'warning' : 'error';
            const field_class = level === 'warning' ? 'field-warning' : 'field-error';
            const note_class = level === 'warning' ? 'numeric_warning_note' : 'numeric_error_note';
            
            var rc = elem.closest('.rc-container');
            var converter_container = elem.closest('.unit-converter-container');
            var note_container = converter_container.length ? converter_container : elem.parents('.fr-field-container').last();
            if (remove) {
                elem.removeClass('numeric_error');
                if (!elem.hasClass('percentage-error')) {
                    elem.removeClass('field-error field-warning');
                }
                if (rc.length && !rc.find('.numeric_error').length) {
                    rc.nextAll('.numeric_error_note, .numeric_warning_note').remove();
                } else if (!note_container.find('.numeric_error').length) {
                    note_container.find('.numeric_error_note, .numeric_warning_note').remove();
                }
            } else {
                if (rc.length) {
                    /** need to save ids for target elem and all error elems so we can reselect after rowscols re-render */
                    var id = elem.attr('id');
                    var err_elems = [];
                    rc.find('.numeric_error').each(function() {
                        err_elems.push('#' + $(this).attr('id'));
                    });
                    if (!rc.next('.numeric_error_note, .numeric_warning_note').length) {
                        rc.after('<div class="fnote ' + note_class + '">' + note + '</div>');
                    }
                    elem.removeClass('field-error field-warning').addClass(field_class + ' numeric_error').focus().trigger('select');
                    $(err_elems.join(',')).removeClass('field-error field-warning').addClass(field_class + ' numeric_error');
                    /** do it again if rowscols is re-rendered - note '.one' so event only fires once */
                    rc.off('rowscols_rendered.error').one('rowscols_rendered.error', function() {
                        $('#' + id).removeClass('field-error field-warning').addClass(field_class + ' numeric_error').focus().trigger('select');
                        $(err_elems.join(',')).removeClass('field-error field-warning').addClass(field_class + ' numeric_error');
                    });
                } else {
                    elem.removeClass('field-error field-warning').addClass(field_class + ' numeric_error');
                    if (!note_container.find('.numeric_error_note, .numeric_warning_note').length) {
                        note_container.append('<div class="fnote ' + note_class + '">' + note + '</div>');
                    }
                }
            }
        },

        events: {
            keyboard_shortcuts: [
                /*
                 * DESCRIPTION
                 * ========================================================
                 * This is an array of keyboard shortcuts used by all artlogic pages
                 *
                 * see aui.keyboard_shortcut for more information on how to use
                 *
                 */
                // {
                //     name: "close_overlay_box",
                //     key_code: 27,
                //     method: function() {
                //         window.app.ui.popup.close(function() {
                //             window.aui.slide.close();
                //         });
                //     },
                //     condition: function() {
                //         return window.app.ui.popup.state() && !(Object.keys(window.app.ui.popup.boxes).length == 1 && window.app.ui.popup.boxes['aui-panel-default'].css_class.indexOf('aol-settings-pane') > -1);
                //     },
                //     allow_for_popup: true
                // },
                {
                    name: "hide_dock",
                    key_code: 27,
                    method: function() {
                        window.app.page.hide();
                    },
                    condition: function() {
                        return window.app.page.is_docked && !window.app.ui.popup.state();
                    },
                    allow_for_popup: true
                },
                {
                    name: "safe_reload",
                    key_code: 82,
                    modifier_keys: ["metaKey"],
                    method: function() {
                        var this_changed_msg = window.app.page.MESSAGES?.reload_page_changed || MESSAGES.reload_page_changed,
                            children_changed_msg = window.app.page.MESSAGES?.reload_children_changed || MESSAGES.reload_children_changed;

                        if (window.app.page.changed || window.app.page.changed_children()) {
                            window.app.page.update("reload_prompt", true);
                            window.h.confirm({
                                msg: window.app.changed ? this_changed_msg : children_changed_msg,
                                ok_label: "Reload",
                                close_on_click_outside: true,
                                callback: function() {
                                    window.app.page.confirmed_unload = true;
                                    window.app.page.reload();
                                },
                                on_close: function() {
                                    window.app.page.update("reload_prompt", false);
                                }
                            });
                        } else {
                            window.app.page.update("reload_prompt", false);
                            window.app.page.reload();
                        }
                    },
                    condition: function() {
                        return !window.app.page.reload_prompt;
                    },
                    allow_for_popup: true,
                    ignore_inputs: true
                }
            ],
            set_keyboard_shortcuts: function(keyboard_shortcuts) {

                /*
                 * DESCRIPTION
                 * ========================================================
                 * This function passes the keyboard shortcuts to the artlogic ui method. If you want to use the same shortcuts
                 * for different methods in different circumstances, you can regulate this with the condition property
                 * of the keyboard shortcut object.
                 *
                 * Here's an example:
                 *
                 * keyboard_shortcuts = [
                 *     {
                 *         name: "open_artwork_image_slideshow",
                 *         key_code: "80",
                 *         method: function() {
                 *             open_artwork_image_slideshow();
                 *         },
                 *         condition: function() {
                 *             return artwork_image_is_selected(); //returns true if the artwork image is selected
                 *         }
                 *     },
                 *     {
                 *         name: "open_additional_image_slideshow",
                 *         key_code: "80",
                 *         method: function() {
                 *             open_additional_image_slideshow();
                 *         },
                 *         condition: function() {
                 *             return additional_image_is_selected(); //returns true if the additonal image is selected
                 *         }
                 *     }
                 * ]
                 *
                 * In this example we have two shortcuts that use the same key. It might make sense to use the same key to open
                 * a slideshow, but show different things depending on what is selected. So here we have made sure that there's no
                 * conflict between these shortcuts by saying that they should only work if the right type of image is selected.
                 *
                 */

                var _keyboard_shortcut = window.aui.keyboard_shortcut;

                if (keyboard_shortcuts) {
                    _keyboard_shortcut.set_keyboard_shortcuts(keyboard_shortcuts);
                }

            }

        },

        ///////////////////////////////////
        // TEMPLATE METHODS
        ///////////////////////////////////
        template: {
            change_password: aui.preload_template(window.h.static_url("/lib/aol/shared/templates/change_password.html")),
            update_user_details: aui.preload_template(window.h.static_url("/lib/aol/shared/templates/change_user_details.html")),
            change_temporary_password: aui.preload_template(window.h.static_url("/lib/aol/shared/templates/change_temporary_password.html")),
            password_strength_overlay: aui.preload_template(window.h.static_url("/lib/aol/records/users/templates/strength.html")),
            two_factor_auth_setup: aui.preload_template(window.h.static_url("/lib/aol/records/users/templates/two_factor_auth_setup.html")),
            member_event_drawer_events: aui.preload_template(window.h.static_url("/lib/aol/shared/templates/event_drawer.html")),
            member_event_dashboard: aui.preload_template(window.h.static_url("/lib/aol/shared/templates/event_dashboard.html")),
            dpa_agree_modal: aui.preload_template(window.h.static_url("/lib/aol/shared/templates/data-protection-addendum.html")),
            set_valid_email: aui.preload_template(window.h.static_url("/lib/aol/shared/templates/set_valid_email.html")),
            two_factor_authentication_settings: aui.preload_template(window.h.static_url("/lib/aol/shared/templates/two_factor_authentication_settings.html")),
            /*
             * Use this as an interface to handlebars,
             * this way we can more easily change the
             * template engine in the future.
             *
             * template can be an id
             *
             */
            compile: function(template, data, return_compiled_template) {
                var source = $(template).length && template.indexOf('<') === -1 ? $(template).html() : template,
                    compiled_template = Handlebars.compile(source),
                    html = compiled_template(data);

                if (return_compiled_template) {
                    return compiled_template;
                } else {
                    return html;
                }
            },
            partial: function(name, source) {
                Handlebars.registerPartial(name, source);
            },
            templates: Handlebars.templates,
            load: function (url, callback) {
                // Check if url links to a static file (by checking it has a filetype).
                // If so, call the static_url method on it.
                var last_part = url.split('/').pop();
                if (last_part.indexOf('.') !== -1) {
                    // has a fileending
                    return window.aui.preload_template(window.h.static_url(url), callback);
                }
                url = '/' + window.aol_prefs.site + url;
                return window.aui.preload_template(url, callback);
            },
            get: function(template_id) {
                return window.aui.compiled_templates[template_id];
            }
        },
        load_templates: function() {
            this.templates = {
                grid_wrapper: this.template.load("/lib/aol/records/shared/templates/grid_wrapper.html"),
                beta_testing_messages: this.template.load("/lib/aol/shared/templates/beta-messages.html"),
                import_records: this.template.load("/lib/aol/shared/templates/import-records.html"),
                change_profile_picture: this.template.load("/lib/aol/shared/templates/change-profile-picture.html"),
                change_homepage_banner: this.template.load("/lib/aol/shared/templates/change-homepage-banner.html"),
                change_default_site_banner: this.template.load("/lib/aol/shared/templates/change-default-site-banner.html"),
                theme_switch_banner_style_element: this.template.load("/lib/aol/shared/templates/theme-switch-banner-style.html"),
                rejected_emails: this.template.load('/lib/aol/records/modification_history/templates/overlaybox/rejected_emails.html'),
                // member_event_dashboard: this.template.load("/lib/aol/shared/templates/event_dashboard.html")
            }
        },

        ///////////////////////////////////
        // HANDLEBARS HELPERS
        ///////////////////////////////////
        init_handlebars_helpers: function() {

            var that = this;

            Handlebars.registerHelper('smart_icons_bool', function(v) {
                // this function requires a list of a [0] bool && [1] string === 'required' || 'optional'
                // and returns one of our icons (success, danger, warn) if field is present,
                // not present and required, or not present and optional
                // used for membership events dashboard
                if (v[0]===true) {
                    return '<i class="fa fa-check aui-text-success"></i>'
                } else if (v[0]===false && v[1]==='required') {
                    return '<i class="fa fa-times aui-text-danger"></i>'
                } else {
                    return '<i class="fa fa-exclamation-triangle aui-text-warning"></i>'
                }
            });

            Handlebars.registerHelper('smart_icons_int', function(v, count) {
                // this function requires a list of a [0] int && [1] string === 'required' || 'optional'
                // and returns one of our icons (success, danger, warn) if field is present and equal to total count,
                // not equal to total count and required, or not equal and optional
                // used for membership events dashboard, in the 'artworks' section
                var count = !Array.isArray(count) ? [count] : count
                if (v[0]===count[0] && count[0] !== 0) {
                    return '<i class="fa fa-check aui-text-success"></i>'
                } else if (v[0]!==count[0] && v[1]!=='optional' && count[0] !== 0) {
                    return '<i class="fa fa-times aui-text-danger"></i>'
                } else {
                    return '<i class="fa fa-exclamation-triangle aui-text-warning"></i>'
                }
            });

            Handlebars.registerHelper('smart_icons_price', function(currency, price, total_artworks) {
                /*
                    Given a retail price and a currency, check whether:
                    - all artworks are in the required currency for the event
                    - all artworks have a retail price as required for the event
                */
                console.log("Currency: ", currency, "Price: ", price, "Out of ", total_artworks)
                // to bugcheck re. if these are the same artworks that have price && correct currency
                var total_artworks_complete = currency[0] === total_artworks && price[0] === total_artworks ? total_artworks : currency[0] < price[0] ? currency[0] : price[0]
                var total_message = `${currency[1]} prices added for <b>${total_artworks_complete} artworks</b>`
                if (currency[0] === total_artworks && price[0] === total_artworks) {
                    return `<i class="fa fa-check aui-text-success"></i> ${total_message}`
                } else if ((currency[0] !== total_artworks || price[0] !== total_artworks) && price[1]) {
                    return `<i class="fa fa-times aui-text-danger"></i> ${total_message}`
                } else {
                    return `<i class="fa fa-exclamation-triangle aui-text-warning"></i> ${total_message}`
                }
            })

            Handlebars.registerHelper('get_value_from_array', function(v, index) {
                // get the provided index out of an array to display as string
                // used in membership dashboard, artworks section where we need a value as an array
                // to determine if required (see above functions) and then the value itself.
                if (Array.isArray(v) && !isNaN(index)) {
                    return v[index]
                } else {
                    return v
                }
            });

            Handlebars.registerHelper('check_if_field_optional', function(v, options) {
                // a temporary solution to deal with the arrays in the membership dashboard.
                // smart_if won't work for these as we need a string or an int - won't accept an array
                if (Array.isArray(v) && v[1] && v[1].toLowerCase() === 'optional') {
                    return '<span class="fnote">(Optional)</span>'
                } else {
                    return '';
                }
            });

            Handlebars.registerHelper('get_event_details_from_id', function(v, key, options) {
                // on member-connected databases, given an event id, lookup the provided
                // key and get the value, if provided
                var event_details = ''
                if (window.page_settings.member_event_settings[v]) {
                    if (key) {
                        event_details = window.page_settings.member_event_settings[v][key]
                    }
                }

                return event_details

            });

            Handlebars.registerHelper('event_check_for_missing_requirements', function(artwork, options) {
                // on member-connected databases, given an artwork, check if it is missing any of the
                // fields required for the event that we are looking at.
                // will need to add a few items to 'fields' in the config (description, check for more)
                var requirement_warning = ''
                if (window.record.event_requirements) {
                    if (artwork) {
                    //   console.log(artwork)
                            // window.record.event_requirements.artworks
                            /* check this artwork for the required fields
                                specified by the event (in this window.record.event_requirements object)
                                if they are empty, show the warning indicator HTML
                                */
                        requirement_warning = '<div class="aui-bubble aui-warning hidden" id="event-missing-artworks-details-warning" data-id="' + artwork.id + '"><i class="fa fa-exclamation-triangle aui-text-warning"></i></div>'

                    }
                }

                return requirement_warning

            });

            Handlebars.registerHelper('strip_html', function (v) {
                // .text() is expecting content to be within a div — update for stripping text from handlebars headers
                return jQuery($("<div>" + v + "</div>")).text();
            });

            Handlebars.registerHelper('snake_to_display', function(v) {
                v = v.split("_").join(" ");
                return v;
            });

            Handlebars.registerHelper('smart_if', function (v1, operator, v2, options) {

                switch (operator) {
                    case '==':
                        return (v1 == v2) ? options.fn(this) : options.inverse(this);
                    case '===':
                        return (v1 === v2) ? options.fn(this) : options.inverse(this);
                    case '!=':
                        return (v1 != v2) ? options.fn(this) : options.inverse(this);
                    case '!==':
                        return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                    case '<':
                        return (parseFloat(v1) < parseFloat(v2)) ? options.fn(this) : options.inverse(this);
                    case '<=':
                        return (parseFloat(v1) <= parseFloat(v2)) ? options.fn(this) : options.inverse(this);
                    case '>':
                        return (parseFloat(v1) > parseFloat(v2)) ? options.fn(this) : options.inverse(this);
                    case '>=':
                        return (parseFloat(v1) >= parseFloat(v2)) ? options.fn(this) : options.inverse(this);
                    case '&&':
                        return (v1 && v2) ? options.fn(this) : options.inverse(this);
                    case '&&!':
                        return (v1 && !v2) ? options.fn(this) : options.inverse(this);
                    case '!&&':
                        return !(v1 && v2) ? options.fn(this) : options.inverse(this);
                    case '||':
                        return (v1 || v2) ? options.fn(this) : options.inverse(this);
                    case '||!':
                        return (v1 || !v2) ? options.fn(this) : options.inverse(this);
                    case '!||':
                        return !(v1 || v2) ? options.fn(this) : options.inverse(this);
                    case 'in':
                        return (v2 && v2.indexOf(v1) >= 0) ? options.fn(this) : options.inverse(this);
                    case 'not in':
                        return (v2 && v2.indexOf(v1) === -1) ? options.fn(this) : options.inverse(this);
                    case 'includes_undefined':
                        // where we might need to check if pref is not on (undefined), then check a subsequent value if pref is on
                        var undefined_list = [undefined, v2]
                        return undefined_list.includes(v2) ? options.fn(this) : options.inverse(this);
                    default:
                        return options.inverse(this);
                }
            });


            window.Handlebars.registerHelper("if_field_greater_than_zero", function(field_1, field_2, options) {
               /*
                    Given two fields, check if their value is present (prioritizing the first field),
                    and if so, not 0. Return the function if so.
               */
               var field_present = parseFloat(field_1) || parseFloat(field_2);
               if (field_present) {
                   if (field_present != 0) {
                       return options.fn(this);
                   }
               }
               return options.inverse(this);
            });

            window.Handlebars.registerHelper("if_not_zero", function(amount, options) {
                if (window.h.parse_float(amount)) {
                    return options.fn(this);
                } else {
                    return options.inverse(this);
                }
            });

            Handlebars.registerHelper('if_multi_or', function () {
                var options = arguments[arguments.length-1];
                // Assuming that all wanted operator are '||'
                for (var i = 0; i < (arguments.length - 1); i++) {
                    if (arguments[i]) {
                        return options.fn(this);
                    }
                }
                return options.inverse(this);
            });

            Handlebars.registerHelper('if_multi_and', function () {
                var options = arguments[arguments.length-1];
                // Assuming that all wanted operator are '&&'
                for (var i = 0; i < (arguments.length - 1); i++) {
                    if (!arguments[i]) {
                        return options.inverse(this);
                    }
                }
                return options.fn(this);
            });

            Handlebars.registerHelper('show_editions', function (options) {
                return ['main','unique'].indexOf(window.conf.view) == -1 ? options.fn(this) : options.inverse(this);
            });

            Handlebars.registerHelper('call_helper', function(helper_name, variable, row, options) {
                var return_string = variable;
                if (Handlebars.helpers[helper_name]) {
                    return_string = Handlebars.helpers[helper_name](variable.toString(), row, options);
                }
                return new Handlebars.SafeString(return_string);
            });

            Handlebars.registerHelper('get_image', function(image_url_template, image_settings) {
                if (image_url_template) {
                    var url = image_url_template.replace("[size]", image_settings || "").replace("[site]", window.aol_prefs.site);
                    return url;
                }
                return '';
            });

            Handlebars.registerHelper('get_image_url', function(image_id, image_preset) {
                if (image_id) {
                    var url = window.h.image_url(image_preset, image_id);
                    return url;
                }
                return '';
            });

            Handlebars.registerHelper('rowscols_as_array', function(rowscols) {
                if (rowscols) {
                    var arr = rowscols.split('<r>');
                    arr.forEach(function(el, i, arr) {
                        arr[i] = el.split('<c>')
                    });
                    return arr;
                }
            });

            Handlebars.registerHelper('list_item_classes', function(item) {

                var classes_string = "browse-item";

                if (item) {

                    if (item.expired || item.not_live || item.closed) {
                        classes_string += " row-muted";
                    }
                    if (item.on_guest_list) {
                        classes_string += " attendee-row";
                        classes_string += " attendee_" + item.contact_id;
                        if (item.attended) {
                            classes_string += " attendee-checked";
                        }
                    }
                    if (item._inactive_on_list) {
                        classes_string += " browse-item-inactive";
                    }
                    if (item._redacted) {
                        classes_string += " browse-item-redacted";
                    }
                    if (!item.main_image_uid && !item.main_image && !item.image_uid) {
                        classes_string += " browse-item-has-no-image";
                    }
                    if (window.conf) {
                        if (window.conf.options.click_through || window.conf.options.selectable || window.conf.options.items_clickable) {
                            classes_string += " browse-item-clickable";
                        }
                    }
                    if (item.class_attr) {
                        classes_string += " " + item.class_attr;
                    }
                }

                return classes_string;
            });

            Handlebars.registerHelper('list_item_attrs', function(item) {
                var attrs_string = '';
                if (item.on_guest_list) {
                    attrs_string += 'data-contact_id="' + item.contact_id + '" ' +
                    'data-checked="' + (item.attended ? 1 : 0) + '" ' +
                    (item.guest_of ? 'data-guest_of="' + item.guest_of + '" ' : '') +
                    (item.guest_of_contact_id ? 'data-guest_of_contact_id="' + item.guest_of_contact_id + '" ' : '');
                }

                return new Handlebars.SafeString(attrs_string);
            });

            Handlebars.registerHelper("row_group_separator", function (item, index, options) {
                if (!(window.conf && window.browse)) {
                    return options.fn(this);
                }
                if (!window.app.list_state || (window.app.list_state || {}).request_id !== options.data.root.request_id) {
                    window.app.list_state = {};
                }
                window.app.list_state.request_id = options.data.root.request_id;

                var sort_obj = window.app.utils.get_item_by_property(window.conf.sort_options, window.browse.main_list.state.current.sort_option, 'name') || {};

                if (!sort_obj.title_field) {
                    return options.fn(this);
                }

                var title = item[sort_obj.title_field];

                var divider = '';
                var group_start = '';
                var group_end = '';
                if (window.app.list_state[sort_obj.title_field] !== title) {
                    group_start = '<div class="aui-item-group">';
                    divider = '' +
                        '<div class="aui-item-divider">' +
                            '<div class="aui-item-divider-title">' + title + '</div>' +
                            '<div class="aui-item-divider-hr"></div>' +
                        '</div>';
                    group_end = index !== 0 ? '</div>' : '';
                }
                window.app.list_state[sort_obj.title_field] = title;
                return new Handlebars.SafeString(group_end + divider + group_start + options.fn(this));
            });

            Handlebars.registerHelper('list_item_action_classes', function(options) {

                var item_actions = ['edit', 'favourites', 'narrative', 'trash', 'flag', 'importance', 'item_menu'],
                    classes_string = "",
                    width = 0,
                    settings = $.extend({}, options),
                    number_of_buttons = 0;

                item_actions.forEach(function(option) {
                    if (settings[option]) {
                        width += 30;
                        number_of_buttons += 1;
                        // importance takes up more space
                        if (option == 'importance') {
                            width += 10;
                        }
                        if (option == 'item_menu') {
                            width += 20;
                        }
                    }
                });

                if (width) {
                    width += 10;
                }
                // we increase the size/spacing of the buttons on
                // touch devices - so we need to add some more width
                if (window.devices.handheld) {
                    if (number_of_buttons > 3) {
                        width += 30;
                    } else {
                        width += 10;
                    }
                }

                classes_string += "aui-width-" + width + "px";


                return classes_string;
            });

            Handlebars.registerHelper('column_classes', function(options, index, add_index) {
                if (typeof add_index == 'boolean' && add_index) {
                    index++;
                }
                var classes_string = "",
                    settings = (options || [])[parseInt(index)];

                classes_string = "aui-table-column-" + index;

                if (settings) {
                    classes_string += " aui-width-" + (settings.width || "none") +
                                      " aui-min-width-" + (settings.min_width || "none") +
                                      " aui-height-" + (settings.height || "none") +
                                      " aui-text-align-" + settings.text_align +
                                      " " + settings.class_attr;
                }
                if (settings && settings.truncate_text) {
                    classes_string += " aui-overflow-ellipsis-all";
                }
                if (settings && settings.field_is_inline) {
                    classes_string += " grid-inline-field";
                }
                if (settings && settings.overflow_text) {
                    classes_string += " aui-overflow-visible";
                }
                if (settings && settings.overflow === "ellipsis") {
                    classes_string += " aui-overflow-ellipsis";
                }
                return classes_string;
            });

            Handlebars.registerPartial('list_buttons', '');

            Handlebars.registerHelper('square_crop_image_preview_html_from_uid', function(uid) {
                if (!uid) {return '';}
                var preview_url = window.h.image_url('square_preview', uid); // was 'tiny'
                var full_url = window.h.image_url('best', uid);
                var html = '<a href="' + full_url + '" target="_blank"><div class="list-medium-square-image-preview-container"><img src="' + preview_url + '" class="list-medium-square-image-preview-image"></div></a>';
                return new Handlebars.SafeString(html);
            });

            Handlebars.registerHelper('grouped_each', function(context, every, options) {
                var out = "", subcontext = [], current_group_index = 0, i;
                if (context && context.length > 0) {
                    subcontext['_group_index'] = current_group_index;
                    subcontext['_group_size'] = every;
                    for (i = 0; i < context.length; i++) {
                        if (i > 0 && i % every === 0) {
                            out += options.fn(subcontext);
                            subcontext = [];
                            current_group_index++;
                            subcontext['_group_index'] = current_group_index;
                            subcontext['_group_size'] = every;
                        }
                        subcontext['_last'] = i == context.length - 1;
                        subcontext.push(context[i]);
                    }

                    out += options.fn(subcontext);
                }
                return out;
            });

            Handlebars.registerHelper('math', function (operation, n1, n2, options) {
                var return_value;

                switch (operation) {
                    case 'add':
                        return_value = window.h.parse_float(n1) + window.h.parse_float(n2);
                        break;
                    case 'divide':
                        return_value = window.h.parse_float(n1) / window.h.parse_float(n2);
                        break;
                    case 'subtract':
                        return_value = window.h.parse_float(n1) - window.h.parse_float(n2);
                        break;
                    case 'multiply':
                        return_value = window.h.parse_float(n1) * window.h.parse_float(n2);
                        break;
                }

                return return_value;
            });

            Handlebars.registerHelper('capitalise', function(string) {
                if (string) {
                    return string.charAt(0).toUpperCase() + string.slice(1);
                }
            });

            /* ARTWORKS */

            Handlebars.registerHelper('return_availability_icon', function(availability, status, edition_master_record, market_id) {
                var return_string = h.return_availability_icon(availability, status, edition_master_record, market_id);
                return new Handlebars.SafeString(return_string);
            });

            Handlebars.registerHelper('return_availability', function(availability, status, edition_master_record, market_id) {
                var return_string = h.return_availability(availability, status, edition_master_record, market_id);
                return new Handlebars.SafeString(return_string);
            });

            /* For selling in the website */
            Handlebars.registerHelper('if_available_in_online_shop', function(status, availability, options) {
                var s_a = status + '-' + availability;

                if (window.page_settings.availabilities_for_online_shop.indexOf(s_a) != -1) {
                    return options.fn(this);
                } else {
                    return options.inverse(this);
                }

            });

            Handlebars.registerHelper('return_gallery_code', function(gallery) {
                var return_string = window.aol_prefs.gallery_codes.map[gallery];
                if (return_string) {
                    return new Handlebars.SafeString(return_string);
                }
            });

            /* OFFERS */
            Handlebars.registerHelper('format_offer_price', function(currency_id, price, price_override) {
                if (price_override) {
                    return price_override;
                } else {
                    if (window.h.parse_float(price) > 0) {
                        return new Handlebars.SafeString((currency_id || '') + ' ' + price);
                    } else {
                        return '(none entered)'
                    }
                }
            });

            Handlebars.registerHelper('format_date', function (date, options) {
                return new Handlebars.SafeString(window.h.format_date(date, options.hash));
            });

            Handlebars.registerHelper('format_datetime', function (datetime, options) {
                return new Handlebars.SafeString(window.h.format_datetime(datetime, options.hash));
            });

            Handlebars.registerHelper('format_month', function (datetime, options) {
                return new Handlebars.SafeString(window.h.format_month(datetime, options.hash));
            });

            Handlebars.registerHelper('format_timestamp', function (timestamp, options) {
                return new Handlebars.SafeString(window.h.format_timestamp(timestamp, options.hash));
            });

            Handlebars.registerHelper('format_date_difference', function (date, options) {
                return new Handlebars.SafeString(window.h.format_date_difference(date, options.hash));
            });

            Handlebars.registerHelper('format_datetime_difference', function (date, options) {
                return new Handlebars.SafeString(window.h.format_datetime_difference(date, options.hash));
            });

            Handlebars.registerHelper('format_number', function(value, blank_zero, strip_decimals) {
                return window.h.format_number.decimal(value, blank_zero, strip_decimals);
            });

            /* remove commas etc from a number value */
            Handlebars.registerHelper('unformat_number', function(value) {
                return window.h.parse_formatted_number(value);
            });

            Handlebars.registerHelper('linkify', function(value) {
                if (value.indexOf('http://') == -1 && value.indexOf('https://') == -1) {
                    value = 'http://' + value;
                }
                return value;
            });

            Handlebars.registerHelper('return_display_value_or_message', function(value, message){
               // returns value or if value is empty return message e.g 'N/A'
               var return_string = value;
               if (!return_string) {
                 return_string = message
               };
                return return_string;
            });

            Handlebars.registerHelper('if_artlogic', function(options) {
                if (window.aol_prefs.site === 'artlogic') {
                    return options.fn(this);
                } else {
                    return options.inverse(this);
                }
            });

            Handlebars.registerHelper('capitalise', function(s) {
                return window.h.format_text.f('capitalise', s);
            });

            Handlebars.registerHelper('get_currency', function(currency_id) {
                return new Handlebars.SafeString(window.aol_prefs.currencies.map[currency_id] || '');
            });

            Handlebars.registerHelper('get_account_type', function(inverse) {
                return page_settings.aol_account_type;
            });

            Handlebars.registerHelper('get_account_display_type', function(inverse) {
                return page_settings.aol_account_display_type;
            });

            Handlebars.registerHelper('get_custom_label', function(default_label, item_id) {
                var labels = aol_prefs.system_strings[page_settings.aol_account_display_type];
                if (labels) {
                    return labels[item_id] || default_label;
                } else {
                    return default_label;
                }
            });

            Handlebars.registerHelper('show_view_button', function(field) {
                return '<button class="aui-button-simple-arrow">View</button>';
            });

            Handlebars.registerHelper('invert_percentage', function(percentage) {
                /** return e.g. 35 given 65. returns 0 if < 0 or 100 if > 100 */
                return Math.min(100, Math.max(0, 100 - window.h.parse_float(percentage)))
            });

            Handlebars.registerHelper('localise_number', function(value){
                return h.format_number.decimal(value);
            })

            Handlebars.registerHelper('decode_uri', function(value) {
                return decodeURI(value);
            });

            Handlebars.registerHelper('encode_value', function(value) {
                return h.encode_value(value);
            });

            Handlebars.registerHelper('get_field', function(data, fieldname) {
                var return_string = "";

                return_string = data[fieldname] || '';

                return new Handlebars.SafeString(return_string);
            });



            Handlebars.registerHelper('list_items_link', function(id) {
                var special_view = window.aol_prefs.path_to_records + 'photos/list/' + id + '/',
                    photos_search = window.aol_prefs.path_to_records + 'photos',
                    links = [
                        {
                            label: 'Find in installation views',
                            url: photos_search
                        },
                        {
                            label: 'View list',
                            url: special_view
                        }
                    ],
                    html = '<button class="aol-sticky-link-list aui-button-simple-arrow" data-links="'+h.encode_value(JSON.stringify(links))+'">View</button>';

                return new Handlebars.SafeString(html);
            });

            Handlebars.registerHelper('static_url', function(url) {
                return window.h.static_url(url);
            });

            Handlebars.registerHelper('user_name', function(user_id) {
                const user = window.aol_prefs.users.map.find(function(user) {
                    return user.id == user_id;
                })
                if (user) {
                    return new Handlebars.SafeString(user.name);
                }
                return '';
            })

            Handlebars.registerHelper('user_icon', function(user_id, options) {
                /*
                Use like:

                    {{user_icon <user_id> size=64}}

                where size is an optional param (defaults to 32px).

                Returns a circle with the profile pic if it exists, and falls
                back to a users' initials.

                There is a similar python function in context_helpers_users,
                so if updating this one you should probably update that one too
                */
                var icon = window.h.user_icon.get(user_id, options.hash);
                if (icon.length) {
                    return new Handlebars.SafeString(icon[0].outerHTML);
                }
                return '';
            });

            Handlebars.registerHelper('newline_to_br', function (str) {
                if (!str) {
                    return '';
                }
                str = str.replace(new RegExp('\r?\n','g'), '<br>');
                return new Handlebars.SafeString(str);
            });

            Handlebars.registerHelper('p_to_br', function (content) {
                /*

                        {{p_to_br '<span><p>Hello world</p><p>Paragraph 2</p></span>'}}

                    will return

                        <span>Hello world<br>Paragraph 2</span>
                */
                return new Handlebars.SafeString(window.h.p_to_br(content));
            });

            Handlebars.registerHelper('format_time_difference', function (datetime, options) {
                return new Handlebars.SafeString(h.format_time_difference(datetime, options.hash));
            });

            Handlebars.registerHelper('format_size', function (size, options) {
                return new Handlebars.SafeString(h.format_size(size, options.hash));
            });

            /** useful for debugging */
            Handlebars.registerHelper('json', function(context) {
                return JSON.stringify(context);
            });

            Handlebars.registerPartial('standard_list_item', '<div class="aui-itm {{options.item_classes}}">{{#unless hide_img}}{{#smart_if img "||" img_uid}}<img class="aui-img" src="{{#if img}}{{img}}{{else}}{{get_image_url img_uid \'tiny\'}}{{/if}}">{{else}}<div class="aui-img-placeholder"></div>{{/smart_if}}{{/unless}}{{#if artlogic_record}}{{return_availability_icon availability_id status_id edition_master_record market_id}}<span class="browse-artwork-list-location" style="vertical-align:initial">{{return_gallery_code gallery_id}}</span>{{#if edition_master_record}}<span class="browse-artwork-list-master">E</span>{{else}}<span class="browse-artwork-list-edition-number">{{edition_number_as_text}}</span>{{/if}}{{/if}}<div class="aui-text">{{{text}}}</div></div>');

            var sns_sanitiser = new Sanitize({
                elements:   ['span', 'i', 'em', 'b', 'strong', 'br', 'div'],
                attributes: {
                    '__ALL__': ['class'],
                }
            });
            Handlebars.registerHelper('sanitise_sns', function(str) {
                var div = $('<div>').append(str)[0];
                var fragment = sns_sanitiser.clean_node(div);
                return $('<div>').append(fragment).html();
            });



        },
        convert_object_to_data_attributes: function (attributes) {
            var attributes_string = '';
            if (attributes) {
                for (var property in attributes) {
                    attributes_string += ' data-'+property+'="'+attributes[property]+'"';
                }
            }
            return attributes_string;
        },
        images: {
            get_url: function(image_url_template, image_settings) {
                //dependencies
                var _site = window.aol_prefs.site;

                var url = false;

                if (image_url_template) {
                    url = image_url_template.replace("[size]", image_settings || "").replace("[site]", _site);
                }

                return url;
            },
            get_dimensions: function(image_url) {

                var image_url,
                    image_url_split,
                    image_dimensions_string,
                    image_dimensions_array,
                    image_dimensions = {};

                if (image_url) {
                    image_url_split = image_url.replace(".jpg", "").split("-");
                    image_dimensions_string = image_url_split[image_url_split.length - 1];
                    image_dimensions_array = image_dimensions_string.split("x");
                    image_dimensions.width = parseInt(image_dimensions_array[0]);
                    image_dimensions.height = parseInt(image_dimensions_array[1]);
                }

                return image_dimensions;
            },
            artwork_cloudinary_image_url: function(image_uid, width, height, crop, options) {
                /* Creates a cloudinary artwork image url.
                 * Example usage:
                 * window.app.images.artwork_image_url('27b79ade7c36b67826833a6c6b9c398e33585829-850x638', 400, 400);
                 * Note that there are two different forms to the URL depending on whether the
                 * 'hash' portion of the URL ends with 'g' (gif), 'p' (png). If
                 * the hash portion ends with 'n' this function returns and empty
                 * string as the file is not an image.
                 */
                return h.image_urls.view(image_uid, width, height, crop, options);
//                if (!image_uid || image_uid.indexOf('n') > -1) {
//                    return '';
//                }
//                var prefix, url_template, url, size_segs, fileending = '.jpg';
//                if (image_uid.indexOf('g') > -1) {
//                    fileending = '.gif';
//                } else if (image_uid.indexOf('p') > -1) {
//                    fileending = '.png';
//                }
//                url_template = 'https://static-assets.artlogic.net/__size__/artlogicimages/aol/__site__/images/view/__uid____fileending__'
//                url = url_template
//                    .replace('__uid__', image_uid)
//                    .replace('__site__', window.aol_prefs['site'])
//                    .replace('__fileending__', fileending)
//                    ;
//                size_segs = [];
//                if (width) {
//                    size_segs.push('w_' + width);
//                }
//                if (height) {
//                    size_segs.push('h_' + height);
//                }
//                if (crop) {
//                    size_segs.push('c_fill');
//                } else {
//                    size_segs.push('c_limit');
//                }
//                url = url.replace('__size__', size_segs.join(','));
//                return url;
            }
        },
        themes: {
            load: function(theme) {
                var that = window.app.themes;
                if (theme) {
                    that.remove_classes();
                    that.add_class(theme);
                    that.store_user_pref(theme);
                    that.apply_homepage_banner_details(theme);
                } else {
                    var stored_theme = that.get_stored_user_pref();
                    if (stored_theme) {
                        that.load(stored_theme);
                    }
                }
            },
            add_class: function(theme) {
                $("html").addClass("aui-theme-" + theme);
                $('.aui-nav-item-theme .aui-dropdown-submenu a').each(function() {
                    if ($(this).text().toLowerCase() == theme) {
                        $(this).children().show();
                    }
                });
            },
            remove_classes: function() {
                $('.aui-nav-item-theme li .theme-select').hide();
                $("html").removeClass(function(index, css) {
                    var classes = (css.match(/(^|\s)aui-theme-\S+/g) || []).join(' ');
                    return classes;
                });
            },
            store_user_pref: function(theme) {
                var data = {
                    key: 'theme',
                    value: theme,
                    merge: 'True'
                };
                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/preferences/set',
                    data: data,
                    method: 'POST',
                });
            },
            get_stored_user_pref: function(theme) {
                var current_theme = '';
                var data = {'user_preference': 'theme'};
                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/preferences/get',
                    data: data,
                    method: 'POST',
                    success: function(result) {
                        (result.value['theme']) ? current_theme = result.value['theme']: current_theme = 'light';
                    },
                });
                return current_theme;
            },

            apply_homepage_banner_details: function(theme) {
                var has_user_banner = '';
                var banner_details = '';

                // var title_colour_default = theme == 'light' ? '#1D2933' : '#FFF';
                // var date_colour_default = theme == 'light' ? '#AAA' : '#DDD';
                // var banner_img_default = theme == 'light' ? "url('../../../images/homepage/background.jpg')" : "url('../../../images/homepage/background-dark.jpg')"
                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/preferences/get_banner_settings',
                    data: {'theme': theme},
                    method: 'POST',
                    success: function(result) {
                        window.app.themes.reset_temp_banner_object();
                        if (result.success) {
                            var banner_object = result.success;
                            if (!_.isEmpty(banner_object.user_banner_details_for_theme)) {
                                banner_details = banner_object.user_banner_details_for_theme;
                                window.app.homepage_banner_settings = banner_details;
                                has_user_banner = true
                            }
                            if (!_.isEmpty(banner_object.default_banner_details_for_theme)) { // if no user settings attempt to user default settings
                                if (!has_user_banner) {
                                    banner_details = banner_object.default_banner_details_for_theme;
                                }
                                window.app.default_site_banner_settings = banner_object.default_banner_details_for_theme;
                                window.aol_prefs.default_site_banner_settings[theme] = banner_object.default_banner_details_for_theme;
                            }

                            //fix annoying delay here?
                            $('#override-homepage-banner').remove();
                            $('#homepage-customisations').remove();


                            if (banner_details) {
                                // apply the theme to the homepage.
                                $('.homepage-title span.title').removeAttr('style');
                                $('.homepage-title span.date').removeAttr('style');
                                $('.homepage-banner').removeAttr('style');

                                var image_url = banner_details.image_uid ? window.h.image_urls.best(banner_details.image_uid): '';
                                var template = window.app.template.get("theme_switch_banner_style_element")
                                var data = {
                                    background_url: image_url,
                                    bp_x: banner_details.banner_focal_point_x,
                                    bp_y: banner_details.banner_focal_point_y,
                                    banner_overlay: banner_details.image_overlay_colour,
                                    banner_title_text_colour: banner_details.title_text_colour,
                                    banner_date_text_colour: banner_details.date_text_colour
                                }
                                var html = template(data);



                                $('body').append(html);
                                $('.homepage-title span.title').addClass('override-applied');
                                $('.homepage-title span.date').addClass('override-applied');
                                $('.homepage-banner').addClass('override-applied');
                            } else {
                                $('.homepage-title span.title').removeAttr('style');
                                $('.homepage-title span.date').removeAttr('style');
                                $('.homepage-banner').removeAttr('style');
                                $('.homepage-title span.title').removeClass('override-applied');
                                $('.homepage-title span.date').removeClass('override-applied');
                                $('.homepage-banner').removeClass('override-applied');
                            }
                        }
                    },
                });
            },

            reset_temp_banner_object() {
                for (let prop in window.app.homepage_banner_settings){window.app.homepage_banner_settings[prop] = ''}
                for (let prop in window.app.default_site_banner_settings){window.app.default_site_banner_settings[prop] = ''}
            }
            // store_locally: function(theme) {
            //     var _local_storage = window.localStorage;

            //     _local_storage.setItem("theme", theme);
            // },
            // get_stored: function() {
            //     var _local_storage = window.localStorage;

            //     return _local_storage.getItem("theme");
            // },
        },
        font: {
            load: function(font) {
                var that = window.app.font;
                if (font) {
                    that.remove_classes();
                    that.add_class(font);
                    that.store_locally(font);
                } else {
                    var stored_font = that.get_stored();
                    if (stored_font) {
                        that.load(stored_font);
                    }
                }
            },
            add_class: function(font) {
                $("html").addClass("aol-font-" + font);
            },
            remove_classes: function() {
                $("html").removeClass(function(index, css) {
                    var classes = (css.match(/(^|\s)aol-font-\S+/g) || []).join(' ');
                    return classes;
                });
            },
            store_locally: function(font) {
                var _local_storage = window.localStorage;

                _local_storage.setItem("font", font);
            },
            get_stored: function() {
                var _local_storage = window.localStorage;

                return _local_storage.getItem("font");
            }
        },
        font_size: {
            load: function(font_size) {
                var that = window.app.font_size;
                if (font_size) {
                    that.remove_classes();
                    that.add_class(font_size);
                    that.store_locally(font_size);
                } else {
                    var stored_font_size = that.get_stored();
                    if (stored_font_size) {
                        that.load(stored_font_size);
                    }
                }
            },
            add_class: function(font_size) {
                $("html").addClass("aui-font-size-" + font_size);
            },
            remove_classes: function() {
                $("html").removeClass(function(index, css) {
                    var classes = (css.match(/(^|\s)aui-font-size-\S+/g) || []).join(' ');
                    return classes;
                });
            },
            store_locally: function(font_size) {
                var _local_storage = window.localStorage;

                _local_storage.setItem("font_size", font_size);
            },
            get_stored: function() {
                var _local_storage = window.localStorage;

                return _local_storage.getItem("font_size");
            }
        },

        get_conf: function (conf_name, options) {
            var settings = (options || {});
            return window.app.request({
                url: window.app.api_urls.get_conf_frontend_data,
                data: {
                    conf_name: conf_name,
                    view: settings.view,
                    view_params: settings.view_params
                },
                dataType: "json",
                method: 'POST'
            });
        },

        ///////////////////////////////////
        // CONF LIST RETRIEVAL
        ///////////////////////////////////
        list: (function() {
            var init = function(conf_name, options) {
                var promise = $.Deferred(),
                    settings = $.extend({post_data: {}}, options),
                    api_url = window.aol_prefs.path_to_records + conf_name + "/get" + (settings.post_data.view ? '/'+settings.post_data.view : ''), // todo: should be coming from the conf
                    template_url = "/lib/aol/records/" + conf_name + "/templates/list.html", // todo: should be coming from the conf
                    get_conf = $.Deferred(),
                    template;

                if (window.conf && window.conf.name == conf_name) {
                    get_conf.resolve(window.conf);
                } else {
                    get_conf = window.app.get_conf(conf_name, settings.post_data);
                }

                get_conf.then(function(conf) {
                    template_url = conf.static_resources.templates.list;

                    if (conf.api_urls.get) {
                        api_url = conf.api_urls.get;
                    }

                    template = window.app.template.load(template_url);
                    for (var property in settings.post_data) {
                        if (settings.post_data.hasOwnProperty(property) && typeof settings.post_data[property] != "string") {
                            settings.post_data[property] = JSON.stringify(settings.post_data[property]);
                        }
                    }

                    if (conf_name == "collections") { 
                        settings.post_data["records_per_page"] = 104
                    }

                    window.app.request({
                        url: api_url,
                        method: 'POST',
                        data: $.extend({},
                            settings.post_data,
                            {
                                return_conf_data: 1,
                                return_conf_data_only: settings.data ? 1 : undefined
                            }
                        ),
                        success: resolve,
                        error: error
                    });

                    function resolve (data) {
                        var return_obj = {
                            render: function (container, layout) {
                                var grid_options = settings.layout || window.app.utils.get_item_by_property(data.layouts, layout, "name") || {};
                                grid_options.template = window.aui.compiled_templates['aui_grid_wrapper'];
                                grid_options.grid_class = "aol-records aol-records-" + conf_name + " aol-records-layout-" + layout;
                                $.extend(grid_options, settings.layout_override);
                                return template.then(function() {
                                    if ((settings.data || data) && (settings.data || data).rows) {
                                        $(container).grid(settings.data || data, grid_options, grid_options.id);
                                    } else {
                                        $(container).html('');
                                    }
                                    return $.Deferred().resolve(settings.data || data).promise();
                                });
                            },
                            data: data,
                            state: settings.post_data
                        }
                        promise.resolve(return_obj);
                    }

                    function error (obj,error,error_message) {
                        promise.reject(error_message);
                        if (settings.on_error) {
                            settings.on_error();
                        }
                    }

                });



                return promise;
            }

            init.render = function(conf_name, container, layout, options) {
                var a = window.app.list(conf_name, options);
                $(container).html('<div class="three-quarters">Loading...</div>');
                return a.then(function(obj) {
                    return obj.render(container, layout);
                });
            }

            return init;
        })(),

        ///////////////////////////////////
        // CONF RECORD RETRIEVAL
        ///////////////////////////////////
        get_record: function (id, conf_name, callback) {
            /*
             * Pass in the table and record id and receive
             * the data from the DB
            */

            // TODO: make a proper backend method for this in the conf
            // instead of using the list results method
            var promise = $.Deferred();
            window.app.list(conf_name || window.conf.name, {post_data: {ids: ''+id}}).done(function(result) {
                var record = (result.data.rows || [{}])[0];
                promise.resolve(record);
                if (callback) {
                    callback(record);
                }
            });
            return promise;
        },

        ///////////////////////////////////
        // SERVER REQUESTS
        ///////////////////////////////////
        request: function(options) {

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

            /* Usually, when this function errors, the traceback loses
            important information and we can't see the actual source of
            the error.

            To combat this, we generate a fake error here (containing the more useful
            traceback) so that we can potentially access it later. */
            var callingError = new Error("AJAX Request Error to " + options.url.replace('/' + aol_prefs.site, ''));
            var settings = $.extend(
                {
                    data: {},
                    dataType: "json",
                    method: "POST",
                    headers: {
                        "X-CSRF-Token": $('meta[name="csrf_token"]').attr(
                            "content"
                        ),
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        if (jqXHR.status === 401) {
                            /** TL not sure why this would redirect
                             * the main page as a result of an ajax request.
                             * Forbidden response returns 403 anyway so... */
                            // set the target dynamically by the current window/iframe
                            var target = "_self";
                            window.open("/" + aol_prefs.site, target);
                            return;
                        } else if (jqXHR.status === 403) {
                            h.alert(
                                options.forbidden_message ||
                                    "Your user settings don't allow access to this resource. User privileges can be changed by an administrator."
                            );
                            return;
                        }

                        if (!errorThrown && jqXHR.status == 0) {
                            /* If these conditions are met, it is almost certainly the case
                            that the error is caused by the request being cancelled from the
                            user clicking to navigate away from the page.

                            In this case, there is no point logging and displaying an error.
                            Therefore we wait half a second to handle the error, which will skip
                            it entirely if the page has been navigated away from.
                            */
                            setTimeout(function() {
                                window.handle_error(callingError);
                                // handle_error(jqXHR, textStatus, errorThrown);
                            }, 500)
                            return;
                        } else if (window.aui.utils.is_function(options.on_error)) {
                            options.on_error(jqXHR, textStatus, errorThrown);
                        } else {
                            _overlay_box.load({
                                content:
                                    "<h1 class='aol-error popup-header'>Sorry - something went wrong.</h1><p>An error occurred while transmitting data. " +
                                    "If this problem persists, please contact Artlogic support.</p>",
                                box_width: "400px",
                            });
                        }

                        if (jqXHR.readyState === 0) {
                            /* We still have access to the source function, so log the ajax error */
                            window.handle_error(errorThrown);
                        } else {
                            /* We've lost important traceback info, so we log our manually generated error
                            from above */
                            window.handle_error(callingError);
                        }
                    },

                },
                options
            );

            // jquery auto executes functions when sent to ajax so remove them
            for (var property in settings.data) {
                if (settings.data.hasOwnProperty(property) && window.aui.utils.is_function(settings.data[property])) {
                    delete settings.data[property];
                }
            }

            return $.ajax(settings);

        },

        sticky_header_content: {
            load: function(template_id, data) {

                var data = data || {},
                    content = "";

                if (!window.aui.header_content.state()) {

                    data.default_values = {
                        sort: window.aui.inputs.browse_list_sort_option ? window.aui.inputs.browse_list_sort_option.value : "Artist, stock no."
                    }

                    content = this.get_content(template_id, data);

                    window.aui.set_header(content);
                }

            },
            get_content: function(template_id, data) {
                var content = "";
                if ($(template_id).attr("type") === "text/x-handlebars-template")  {
                    content = window.app.template.compile(template_id, data);
                } else {
                    content = $(template_id).clone();
                }
                return content;
            },
            hide: function() {
                var sticky_element = $("#aui-header-content-box").find("[data-sticky-element]");
                if (sticky_element.length > 0) {
                    window.aui.close_stickybox();
                }

                window.aui.hide_header(this.offset());
            },
            toggle: function(template_id, data) {

                if ($("#aui-content").scrollTop() > this.offset()) {
                    this.load(template_id, data);
                    $('body').trigger('sticky_header_shown');
                } else {
                    this.hide();
                    $('body').trigger('sticky_header_hidden');
                }
            },
            offset: function() {

                var offset = 160;
                var content_above = document.querySelector('.browse-content-above-list');

                if (content_above && content_above.offsetHeight) {
                    offset = offset + content_above.offsetHeight;
                }

                return offset
            }
        },
        narrative: {

            add_note: function(overlay_content) {

                aui.overlay_box.load({
                    content: overlay_content,
                    callback: function() {
                        window.fieldhelpers.sns.init();
//                        window.edit.field("list_note_contact").parent().addClass("list_note_contact");
                        window.fieldhelpers.jcal.init();

                        return;
                    },
                    buttons: [{
                        'label': 'Save',
                        callback: function() {
                            var url = '',
                                data = {
                                    date: window.edit.fieldvalue("narrative_note_date"),
                                    contact: window.edit.fieldvalue("narrative_note_contact"),
                                    note: window.edit.fieldvalue("narrative_note"),
                                    interest: window.edit.fieldvalue("narrative_note_interest"),
                                    actions: 1,
                                    edit: 1
                                }

    //                        window.app.request({
    //                            url: url,
    //                            method: "POST",
    //                            dataType: "json",
    //                            data: data,
    //                            success: function() {

                                    aui.overlay_box.close();

                                    return;
    //                            }
    //                        });
                        }
                    },
                    {
                        'label': 'Close',
                        callback: function(){
                            aui.overlay_box.close();

                            return;
                        }
                    }]
                });

                return;
            }

        },
        edit_fieldgroup: function (id, fieldgroup, options) {
            var settings = options || {},
                name = settings.conf_name || window.conf.name;
            window.app.page.open({
                url: window.aol_prefs.path_to_records + name + '/edit_fieldgroup/' + id + '/' + fieldgroup,
                post_data: {
                    show_headings: settings.show_headings ? 1 : 0
                },
                ui: 'box',
                width: '775px',
                height: '500px'
            });
        },
        temp_storage: function(id, data, callback, time) {

            var _is_function = window.aui.utils.is_function;

            var self = this.temp_storage;

            if (self.execute) {
                window.clearTimeout(self.execute);
            }

            if (!self.temp) {
                self.temp = {}
            }

            if (!self.temp[id]) {
                self.temp[id] = [];
            }

            self.temp[id].push(data);

            self.execute = window.setTimeout(function() {
                if (_is_function(callback)) {
                    callback(self.temp[id]);
                    self.temp[id] = [];
                }
            }, time || 1000);

        },
        help: {
            load: function(element, content, options) {

                var settings = $.extend({
                    width: "120px",
                    position: "right",
                    valign: "middle",
                    z_index: 2000
                }, options);

                var help_content = "<div class='help-box'>" + content + "</div>";

                $(element).stickyBox(help_content, settings);
            }
        },
        win: {
            close: function() {
                window.close();
            }
        },

        ///////////////////////////////////
        // UI METHODS
        ///////////////////////////////////
        ui: {
            popup: (function() {
                var _aui_overlay_box = window.aui.overlay_box;

                return _aui_overlay_box;
            })(),
            loading_box: function(options) {
                window.app.ui.popup.load($.extend({
                    title_class: 'popup-header aui-text-align-center',
                    content: '<div class="three-quarters">Loading...</div>',
                    close_on_click_outside: false,
                    box_width: "170px",
                    fullscreen: false,
                    animation: 'scale',
                    buttons: false,
                    css_class: "aol-popup-loading-screen",
                    data_cy: "loading-modal"
                }, options));
            },
            control_bar: function(options) {
                var settings = $.extend({
                    id: window.aui.utils.get_uid(),
                    buttons: [
                        {
                            label: 'Done',
                            css_class: 'aui-button-extra-round aui-button-highlighted'
                        }
                    ]
                }, options);

                settings.buttons.forEach(function(btn) {
                    if (!btn.id) {
                        btn.id = window.aui.utils.get_uid();
                    }
                });

                //* data-grid_id gets added dynamically in image_helpers.js show_image_delete_controls_bar
                var template = "<div data-id='{{id}}' class='aui-footer-overlay-bar max-width aui-scrollbar-right-fix'>"+
                    "<div>"+
                    "{{#each buttons}}"+
                    "<button class='aui-footer-bar-btn {{css_class}}'>{{{label}}}</button>"+
                    "{{/each}}</div></div>";

                $("body").append(Handlebars.compile(template)(settings));

                var methods = {
                    load: function () { this.get_element().addClass("active"); },
                    close: function () { this.get_element().removeClass("active"); },
                    get_element: function() {
                        return $(".aui-footer-overlay-bar[data-id='"+settings.id+"']");
                    }
                };

                methods.get_element().find('.aui-footer-bar-btn')
                    .off('click.fbar.btn')
                    .on('click.fbar.btn', function() {
                        var id = $(this).data('id'),
                            btn = window.aui.utils.get_item_by_id(settings.buttons, id) || {},
                            onclick = btn.onclick;

                        if (window.aui.utils.is_function(onclick)) {
                            onclick();
                        }
                        if (btn.cancel || btn.cancel == undefined) {
                            methods.close();
                        }
                    });

                return methods;
            }
        },

        ///////////////////////////////////
        // LOCAL STORAGE
        ///////////////////////////////////
        local_storage: {
            set_item: function(item, value, callback) {
                this.get_items(function(err, stored_items) {
                    var new_stored_items = stored_items || {};
                    new_stored_items[item] = value;
                    _localforage.setItem("stored_items", new_stored_items, function() {
                        if (_utils.is_function(callback)) {
                            callback();
                        }
                    });
                });
            },
            get_item: function(item, callback) {
                this.get_items(function(err, stored_items) {

                    var requested_item = false;

                    if (stored_items) {
                        requested_item = stored_items[item];
                    } else if (err) {
                        console.log(err);
                    }
                    if (_utils.is_function(callback)) {
                        callback(requested_item);
                    }
                });
            },
            remove_item: function(item, callback) {
                this.get_items(function(err, stored_items) {
                    var new_stored_items = stored_items || {};
                    delete new_stored_items[item];
                    _localforage.setItem("stored_items", new_stored_items, function() {
                        if (_utils.is_function(callback)) {
                            callback();
                        }
                    });
                });
            },
            get_items: function(callback) {
                // TODO: callback is firing twice
                _localforage.getItem("stored_items", function(err, value) {
                    if (_utils.is_function(callback)) {
                        callback(err, value);
                    }
                });
            }
        },

        create_new_record: function (conf_name, options) {
            var settings = $.extend({
                _save_record: 1,
                _save: 1,
                _conf_name: conf_name || (window.conf || {}).name
            }, options);

            return window.app.request({
                url: app.api_urls.save,
                data: settings,
                method: 'POST'
            });
        },

        save_record: function (conf_name, rec_id, options) {
            var settings = $.extend({
                _save_record: 1,
                _save: 1,
                _conf_name: conf_name || (window.conf || {}).name,
                _rec_id: rec_id
            }, options);

            return window.app.request({
                url: window.app.api_urls.save,
                data: settings,
                method: 'POST'
            });
        },

        save_records: function (conf_name, record_array) {
            /*
             * record_array
             * ------------
             * array of objects, in folllowing format
             * [{
             *     id: rec_id,
             *     data: {}
             * }]
            */
            return window.app.request({
                url: window.app.api_urls.save_records,
                data: {
                    _conf_name: conf_name,
                    _records: h.replace_all(JSON.stringify(record_array), '\\n', '\\r\\n')
                },
                method: 'POST'
            });
        },

        restore_defaults: {

            /* Restore an individual record via its name (or other identifying
            field) */
            individual_record: function (table, name) {
                return window.app.request({
                    url:  '/' + window.aol_prefs.site + '/api/data/shared/restore_defaults/individual_record',
                    data: {
                        table: table,
                        name: name
                    }
                });
            },

            /* Restore all records in a table */
            all: function (table) {
                var promise = $.Deferred();
                window.h.confirm({
                    msg: 'This will revert any modifications you have made to default records.',
                    callback: function() {
                        window.app.request({
                            url:  '/' + window.aol_prefs.site + '/api/data/shared/restore_defaults/all_records',
                            data: {table: table},
                            success: function () {
                                promise.resolve();
                            }
                        });
                    }
                });
                return promise;
            },

        },

        browse_list: function (conf, options) {

            var that = this;

            /* We don't want this popup list to override the layout etc. of the main list
               so we retrieve the list state here, and then set the list state back to this when
               we close the iframe */
            window.app.local_storage.get_item(conf + '-list_state', function(json_state) {
                that.browse_list_state_before = json_state;
            });

            var settings = $.extend({}, options),
                promise = $.Deferred();

            window.app.page.open({
                url: '/' + window.aol_prefs.site + '/records/' + conf + '/' + (settings.view || ''),
                ui: 'box',
                on_close: function() {
                    window.app.local_storage.set_item(conf + '-list_state', that.browse_list_state_before);
                    promise.reject();
                },
                width: settings.width,
                post_data: $.extend({
                    list_options: JSON.stringify({
                        auto_select_first: false,
                        edit: false,
                        selectable: false,
                        show_header: false,
                        narrative: false,
                        favourites: false,
                        preview_pane: false,
                        sticky_list_controls: true
                    }),
                    footer_buttons: JSON.stringify([
                        {
                            label: 'Use these ' + conf.split('_').join(' '),
                            'class': 'browse-get-list-state-btn aui-button-extra-round aui-button-highlighted'
                        },
                        {
                            label: 'Find flagged ' + conf.split('_').join(' '),
                            'class': 'browse-find-flagged-btn aui-button-simple',
                        },
                        {
                            label: 'Cancel',
                            id: 'browse-list-cancel-btn',
                            'class': 'aui-button-simple'
                        }
                    ])
                }, settings)
            });

            this.browse_list_promise = promise;
            return this.browse_list_promise;
        },

        select_invoice_gallery: function() {
            window.app.template.load("/lib/aol/records/invoices/templates/set_invoice_gallery.html").then(function() {
                return window.app.request({
                    url: window.app.api_urls.get_invoice_as_gallery,
                    dataType: 'json'
                })
            }).done(function(result) {
                var template = window.app.template.get("set-invoice-gallery-template")
                var data = {
                    galleries: window.aol_prefs.galleries.values,
                    current_gallery: result.gallery_id,
                    user_id: window.page_settings.user.id
                }
                var html = template(data);
                window.aui.overlay_box.load({
                    content: html,
                    blur_background: false,
                    close_on_click_outside: false,
                    buttons: [{
                        label: 'Close',
                        cancel: true
                    }]
                });
            });
        },

        set_invoice_gallery: function(elem) {
            var data = {
                id: window.page_settings.user.id,
                gallery: elem.val()
            }
            window.app.request({
                url: window.app.api_urls.set_invoice_as_gallery,
                data: data,
                context: elem.val(),
                method: 'POST'
            }).done(function() {
                window.page_settings.user.invoice_as_gallery = this;
                window.aui.overlay_box.close();
            });
        },

        location: {
            save_location: function(fieldname) {
                var location_to_be_saved = function() {

                    if (window.edit && fieldname) {
                        if (page_settings.tablename && window.edit[page_settings.tablename]) {
                            return window.edit.fieldvalue(page_settings.tablename, fieldname);
                        }
                    }
                    if (fieldname) {
                        return $("#f_" + fieldname).val();
                    }

                    return null
                }();

                if (!location_to_be_saved) {
                    window.h.alert('Location not saved', 'Please enter a location to be saved.');
                    return;
                }

                window.app.request({
                    url: window.app.api_urls.add_location,
                    method: "POST",
                    dataType: "json",
                    data: { 'location': location_to_be_saved },
                    success: function(data) {
                        if (data.success==true) {
                            var field = function() {

                                if (window.edit && fieldname) {
                                    if (page_settings.tablename && window.edit[page_settings.tablename]) {
                                        return window.edit.field(page_settings.tablename, fieldname);
                                    }
                                }
                                if (fieldname) {
                                    return $("#f_" + fieldname);
                                }

                                return null
                            }();
                            field.val(data.item.label);
                            var id_field_name = fieldname === 'location' ? 'location_id' : 'shipped_to_location_id',
                                id_field = function() {
                                    if (window.edit) {
                                        if (page_settings.tablename && window.edit[page_settings.tablename]) {
                                            return window.edit.field(page_settings.tablename, id_field_name);
                                        }
                                    }
                                    return $("#f_" + id_field_name);
                                }();
                            id_field.val(data.item.id);
                            window.h.alert('Success', 'Location "' + h.html_encode(data.item.label) + '" saved')
                        } else {
                            window.h.alert('Location not saved', data['message']);
                        }
                    },
                    error: function(obj, error, error2) {
                        window.h.alert('Location not saved', error + ', ' + error2 + '; please contact support@artlogic.net if this problem persists.');
                    }
                });

                return;
            }
        },

        ///////////////////////////////////
        // USER ACTIONS LOG
        ///////////////////////////////////
        user_actions: [],
        log_user_action: window.aui.utils.debounce(function (action) {
            window.app.user_actions.push(action);
        }, 500),
        get_user_actions: function (limit) {
            return window.app.user_actions.slice(-(limit || 0));
        },

        ///////////////////////////////////
        // UTILS
        ///////////////////////////////////
        utils: {
            get_item_index_by_id: function(dataset, id) {
                var item, i;

                if (dataset) {
                    i = dataset.length;

                    while (i--) {
                        if (dataset[i].id == id) {
                            return i;
                        }
                    }
                }

            },
            get_item_by_id: function(dataset, id) {
                return this.get_item_by_property(dataset, id, "id");
            },
            get_items_by_ids: function(dataset, ids) {

                var items = [];

                for (var i = 0; ids.length>i; i++) {
                    items.push(window.app.utils.get_item_by_id(dataset, ids[i]));
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
            },
            remove_from_array: function(dataset, id) {
                if (Array.isArray(dataset)) {
                    var index = dataset.indexOf(id);
                    if (index > -1) {
                        dataset.splice(index, 1);
                    }
                }
            },
            is_function: function(obj) {
                return !!(obj && obj.constructor && obj.call && obj.apply);
            },
            is_digit: function(value) {
                if((parseFloat(value) == parseInt(value)) && !isNaN(value)){
                    return true;
                } else {
                    return false;
                }
            },
            is_json: function (value) {
                try {
                    JSON.parse(value);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            get_uid: function() {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000) .toString(16) .substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
            },
            array_move_objects: function(array, ids_to_move, id_position, position, position_id_key) {
                var key = position_id_key || "id",
                    objects_to_move = array.filter(function(obj, index) {
                        return ids_to_move.indexOf(obj[key]) > -1;
                    }), // this would insert in the order specified in ids_to_move array: window.app.utils.get_items_by_ids(array, ids_to_move),
                    filtered_array = array.filter(function(obj, index) {
                        return ids_to_move.indexOf(obj[key]) === -1;
                    }),
                    object_position, new_position, my_args;

                if (position=='up' || position=='down') {
                    /** move all selected objects up or down by 1 */
                    object_position = array.indexOf(objects_to_move[0]);
                    new_position = position=='up' ? object_position-1 : object_position+1;
                } else {
                    /** move all selected objects above the chosen index */
                    object_position = window.app.utils.get_item_by_property(filtered_array, id_position, key);
                    new_position = filtered_array.indexOf(object_position);

                    if (position == "below") {
                        new_position = new_position + 1;
                    }
                }

                /** check we're not moving outside of the array */
                new_position = new_position < 0 ? 0 : new_position > array.length-1 ? array.length-1 : new_position;
                my_args = [new_position, 0].concat(objects_to_move);

                if (new_position > -1) {
                    filtered_array.splice.apply(filtered_array, my_args);
                }

                return filtered_array;
            },
            object_is_empty: function (object) {
                return Object.keys(object).length === 0 && object.constructor === Object;
            },
            get_browser_info: function() {
                var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|edge|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
                if(/trident/i.test(M[1])){
                    tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
                    return {name:'IE',version:(tem[1]||'')};
                }
                if(M[1]==='Chrome'){
                    tem=ua.match(/\bOPR\/(\d+)/)
                    if(tem!=null)   {return {name:'Opera', version:tem[1]};}
                    tem=ua.match(/(edge(?=\/))\/?\s*(\d+)/i)
                    if(tem!=null)   {return {name:'Edge', version:tem[2]};}
                }
                M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
                if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
                return {
                    name: M[0],
                    version: M[1]
                };
            },
            get_status_class: function(status, availability) {
                /*
                 * DESCRIPTION
                 * Overrides the status for the thirdparty based on the preference for alternate dot styling
                 *
                 * ARGUMENTS
                 *
                 * STATUS
                 * ----------------------------------------------------------------------------------------------------
                 * TYPE: INT
                 *
                */
                var standard_dot_availabilites = [22, 23, 24]; // potentially available, known about / future potential , not yet made
                var alternate_styling_toggle = window.page_settings.artworks_third_party_status_dot_colour_toggle;
                if(!(standard_dot_availabilites.includes(availability)) && alternate_styling_toggle === 1){
                    if(status === 4 && availability !== 9 ){
                         // if the artwork is 3rd oarty and NOT sold
                        status = 1;
                    }
                    else if(status === 4 && availability === 9){
                         // if the artwork is 3rd oarty and IS sold
                        status = 3;
                    }
                }

                return status;
            },
            get_availability_class: function(availability_number, status, edition_master_record, market_id) {

                /*
                 * DESCRIPTION
                 * Returns the availability of an artwork to be used as a classname for the dot.
                 *
                 *
                 * ARGUMENTS
                 *
                 * availability_number
                 * ----------------------------------------------------------------------------------------------------
                 * type: int
                 * description:
                 *
                 * status
                 * ----------------------------------------------------------------------------------------------------
                 * type: int
                 * description:
                 *
                 * edition_master_record
                 * ----------------------------------------------------------------------------------------------------
                 * type: int
                 * description:
                 *
                 * market_id
                 * ----------------------------------------------------------------------------------------------------
                 * type: int
                 * description:
                 *
                 */

                var availability = "any";

                var dot_id;
                var third_party_style;

                if (aol_prefs.additional_availability_dots && aol_prefs.additional_availability_dots.length) {
                    for (var i=0; i<aol_prefs.additional_availability_dots.length; i++) {
                        dot_id = aol_prefs.additional_availability_dots[i][availability_number];
                        third_party_style = window.page_settings.artworks_third_party_status_dot_colour_toggle;
                        var av_2 = window.app.utils.get_availability_from_dot_id(dot_id);
                        if (av_2) {
                            return av_2;
                        }
                    }
                }


                if (status === 3) {
                    availability = "ex-inventory";
                }

                switch (availability_number) {
                    case 1:
                        if (market_id === 2) {
                            availability = "secondary-market";
                        } else {
                            availability = "available";
                        }
                        break;
                    case 2:
                        availability = "consigned-out";
                        break;
                    case 3:
                        availability = "on-loan";
                        break;
                    case 5:
                        availability = "no-sale";
                        break;
                    case 6:
                        if (status < 3) {
                            availability = "reserved";
                        }
                        break;
                    case 9:
                        if (status === 3 || status === 4) {
                            availability = "sold";
                        }
                        break;
                    case 12:
                        if (status < 3) {
                            availability = "reserved";
                        }
                        break;
                    case 13:
                        if (status < 3) {
                            availability = "reserved";
                        }
                        break;
                }

                if (edition_master_record === 1) {
                    availability = "master";
                }

                return availability;
            },

            get_availability_from_dot_id: function(dot_id) {
                switch (dot_id) {
                    case 1:
                        return 'available';
                    case 2:
                        return 'secondary-market';
                    case 3:
                        return 'on-loan';
                    case 4:
                        return 'reserved';
                    case 5:
                        return 'sold';
                    case 6:
                        return 'third-party';
                    case 7:
                        return 'third-party-sold';
                    case 8:
                        return 'no-sale';
                    case 9:
                        return 'consigned-out';
                    case 10:
                        return 'master';
                    case 11:
                        return 'any';
                }
            }
        },

        api_urls: {
            base: window.api_root(),
            conf_methods: window.api_root() + 'conf/',
            autocomplete: window.api_root() + 'data/shared/autocomplete/',
            add_location: window.api_root() + 'data/shared/add_location/',
            get_artist_dates: window.api_root() + 'data/artworks/get_artist_dates/',
            get_artist_series: window.api_root() + 'data/artworks/get_artist_series/',
            save_artist: window.api_root() + 'data/artists/save/',
            get_offers: window.api_root() + 'data/offers_sp_legacy/get/',
            create_offers_sp_legacy: window.api_root() + 'data/offers_sp_legacy/create/',
            set_offer_status_sp_legacy: window.api_root() + 'data/offers_sp_legacy/set_status/',
            get_offers_by_artwork_id_sp_legacy: window.api_root() + 'data/offers_sp_legacy/get_by_artwork_id/',
            currency: window.api_root() + '/utils/currency/',
            get_global_var: window.api_root() + 'data/globals/get/',
            set_global_var: window.api_root() + 'data/globals/set/',
            contact_purchases: window.api_root() + 'data/contacts/get_contact_purchases/',
            contact_manual_purchases: window.api_root() + 'data/contacts/get_contact_manual_purchases/',
            contact_invoices: window.api_root() + 'data/contacts/get_contact_invoices/',
            contact_purchased_artists: window.api_root() + 'data/contacts/get_purchased_artists',
            contact_collection: window.api_root() + 'data/contacts/get_collection',
            marketing_list_contacts: window.api_root() + 'data/marketing_lists/get_contacts',
            marketing_list_mailings: window.api_root() + 'data/marketing_lists/get_mailings',
            contact_address: window.api_root() + 'data/contacts/get_address/',
            get_next_client_ref: window.api_root() + 'data/contacts/get_next_client_ref/',
            save: window.api_root() + 'data/shared/save/',
            save_user: window.api_root() + 'data/users/save/',
            check_stock_number_is_unique: window.api_root() + 'data/artworks/check_stock_number_is_unique/',
            get_next_highest_stock_number: window.api_root() + 'data/artworks/get_next_highest_stock_number/',
            check_pub_stock_number_is_unique: window.api_root() + 'data/library_and_publications/check_stock_number_is_unique/',
            get_next_highest_pub_stock_number: window.api_root() + 'data/library_and_publications/get_next_highest_stock_number/',
            select_works_to_invoice: window.api_root() + 'data/artworks/select_works_to_invoice/',
            select_works_for_private_view: window.api_root() + 'data/artworks/select_works_for_private_view/',
            set_artwork_lists: window.api_root() + 'data/artworks/set_artwork_lists/',
            artwork_accounts: window.api_root() + 'data/artworks/get_accounts/',
            get_prefs: window.api_root() + 'data/preferences/get/',
            set_prefs: window.api_root() + 'data/preferences/set/',
            get_accounts_stats: window.api_root() + 'data/accounts/get_statistics',
            duplicate: window.api_root() + 'data/shared/duplicate/',
            get_valuelist: window.api_root() + 'data/valuelists/get/',
            calendar_day: window.api_root() + 'data/calendar/day/',
            calendar_month: window.api_root() + 'data/calendar/month/',
            convert_artwork_currency: window.api_root() + 'data/artworks/convert_currency/',
            convert_currency: window.api_root() + 'data/invoices/convert_currency/',
            get_invoice_commissions: window.api_root() + 'data/invoices/get_commissions/',
            get_invoice_number: window.api_root() + 'data/invoices/get_invoice_number/',
            get_next_invoice_number: window.api_root() + 'data/invoices/get_next_invoice_number/',
            get_invoice_contact: window.api_root() + 'data/invoices/get_client_data/',
            download_sundry_invoice: window.api_root() + 'data/invoices/sundry/download/',
            delete_sundry_invoice: window.api_root() + 'data/invoices/sundry/delete/',
            save_invoice_settings: window.api_root() + 'data/invoices/save_settings/',
            get_saved_invoice_settings: window.api_root() + 'data/invoices/get_saved_settings/',
            after_save_sales_pipeline_invoice: window.api_root() + 'data/offers/get_offer_invoice/' ,
            delete_invoice_settings: window.api_root() + 'data/invoices/delete_settings/',
            invoice_actions: window.api_root() + 'data/invoices/actions/',
            invoice_preview: window.api_root() + 'data/invoices/actions/preview/',
            invoice_download: window.api_root() + 'data/invoices/actions/download/',
            invoice_apply_payment: window.api_root() + 'data/invoices/apply_payment/',
            invoice_get_calculations: window.api_root() + 'data/invoices/get_calculations/',
            invoice_check_gc_rates: window.api_root() + 'data/invoices/global_currency/check_rates/',
            invoice_set_gc_rates: window.api_root() + 'data/invoices/global_currency/set_rates/',
            check_invoice_delete_permission: window.api_root() + 'data/invoices/check_delete_permission/',
            accounts_recalculate: window.api_root() + 'data/accounts/recalculate/',
            delete_accounts_record: window.api_root() + 'data/accounts/delete/',
            revert_artwork_sale: window.api_root() + 'data/artworks/revert_artwork_sale/',
            get_new_record_template: window.api_root() + 'data/shared/get_new_record_template/',
            get_artworks_sort: window.api_root() + 'data/website_admin/sort/?type=artworks',
            get_representative_artworks_sort: window.api_root() + 'data/website_admin/sort/?type=representative',
            get_series_sort: window.api_root() + 'data/website_admin/sort/?type=series',
            save_website_sort: window.api_root() + 'data/website_admin/sort/',
            get_artworks_for_sort: window.api_root() + 'data/website_admin/get_artworks/',
            get_series_for_sort: window.api_root() + 'data/website_admin/get_series/',
            get_shop_sort: window.api_root() + 'data/website_admin/sort/?type=shop',
            sns: window.api_root() + 'data/shared/sns/',
            attachments: window.api_root() + 'data/shared/attachments/',
            upload_attachment: window.api_root() + 'data/shared/attachments/upload/',
            manage_attachments: window.api_root() + 'data/shared/attachments/manage/',
            delete_attachment: window.api_root() + 'data/shared/attachments/delete/',
            get_artwork_attachments: window.api_root() + 'data/shared/attachments/get_for_artwork/',
            update_file_control: window.api_root() + 'data/shared/attachments/update_file_control/',
            upload_documents: window.api_root() + 'data/documents_archive/upload/',
            download_documents: window.api_root() + 'data/documents_archive/download/',
            delete_documents: window.api_root() + 'data/documents_archive/delete/',
            create_advanced_report: window.api_root() + 'data/advanced_report/create/',
            get_advanced_report_settings: window.api_root() + 'data/advanced_report/get_settings/',
            save_advanced_report_settings: window.api_root() + 'data/advanced_report/save_settings/',
            delete_advanced_report_settings: window.api_root() + 'data/advanced_report/delete_settings/',
            create_artworks_report: window.api_root() + 'data/artworks/get_report/',
            create_qr_labels_sheet: window.api_root() + 'data/artworks/get_qr_labels/',
            create_preview_document: window.api_root() + 'data/shared/get_document_preview/',
            get_image_to_download: window.api_root() + 'data/artworks/get_image_to_download/',
            update_artworks_tax_codes: window.api_root() + 'data/artworks/update_tax_codes/',
            update_artwork_price_history: window.api_root() + 'data/artworks/update_retail_price_history/',
            template_library_restore_defaults: window.api_root() + 'data/template_library/restore_defaults/',
            get_available_editions: window.api_root() + 'data/artworks/get_available_editions/',
            get_all_editions: window.api_root() + 'data/artworks/get_all_editions/',
            get_display_price: window.api_root() + 'data/artworks/get_display_price/',
            get_edition_images_from_master: window.api_root() + 'data/artworks/get_edition_images_from_master/',
            detach_editions: window.api_root() + 'data/artworks/detach_editions/',
            get_invoice_as_gallery: window.api_root() + 'data/accounts/get_invoice_as_gallery/',
            set_invoice_as_gallery: window.api_root() + 'data/accounts/set_invoice_as_gallery/',
            get_fully_paid_status: window.api_root() + 'data/artworks/get_fully_paid_status/',
            update_images_field: window.api_root() + 'data/image_helpers/update-images-field/',
            update_artwork_locations: window.api_root() + 'data/artworks/update_locations/',
            qrcode: window.api_root() + 'qrcode/',
            get_artwork_calculations: window.api_root() + 'data/artworks/get_calculations/',
            set_current_owner: window.api_root() + 'data/artworks/set_current_owner/',
            email_content_container_group_save: window.api_root() + 'data/email_contents/set_container_group/',
            email_content_container_groups_get: window.api_root() + 'data/email_contents/get_container_groups/',
            email_content_container_group_delete: window.api_root() + 'data/email_contents/delete_container_group/',
            email_content_page_settings_save: window.api_root() + 'data/email_contents/save_page_settings/',
            email_content_page_settings_get: window.api_root() + 'data/email_contents/get_page_settings/',
            email_content_page_settings_delete: window.api_root() + 'data/email_contents/delete_page_settings/',
            email_content_settings_save: window.api_root() + 'data/email_contents/set_settings/',
            email_content_get_record: window.api_root() + 'data/email_contents/get_record/',
            email_content_get_mailing_campaigns: window.api_root() + 'data/email_contents/get_mailing_campaigns/',
            get_organisations_by_name: window.api_root() + 'data/contacts/organisations/get_by_name/',
            get_organisation_members: window.api_root() + 'data/contacts/organisations/get_members/',
            add_organisation_members: window.api_root() + 'data/contacts/organisations/add_members/',
            remove_organisation_members: window.api_root() + 'data/contacts/organisations/remove_members/',
            get_parent_organisations: window.api_root() + 'data/contacts/organisations/get_parents/',
            add_parent_organisations: window.api_root() + 'data/contacts/organisations/add_parents/',
            check_can_make_org: window.api_root() + 'data/contacts/organisations/check_can_make_org/',
            get_related_contacts: window.api_root() + 'data/contacts/related_contacts/get/',
            get_data_for_relationship_select: window.api_root() + 'data/contacts/related_contacts/get_data_for_relationship_select/',
            add_related_contact: window.api_root() + 'data/contacts/related_contacts/add/',
            remove_related_contacts: window.api_root() + 'data/contacts/related_contacts/remove/',
            // email_send: window.api_root() + 'data/email_send', // deprecated
            view_on_a_wall_overrides: window.api_root() + 'data/shared/view_on_a_wall_overrides/',
            ar_overrides: window.api_root() + 'data/shared/ar_overrides/',
            set_contact_email_preferences: '/' + window.aol_prefs.site + '/public/api/email_preferences/set',
            get_timeline: window.api_root() + 'data/timeline/get/',
            timeline_actions: window.api_root() + 'data/timeline/actions/',
            get_timeline_items: window.api_root() + 'data/timeline/get_items/',
            get_document_urls: window.api_root() + 'data/documents/get_urls',
            get_group: window.api_root() + 'data/artworks/groups/get/',
            reorder_group: window.api_root() + 'data/artworks/groups/reorder/',
            delete_from_group: window.api_root() + 'data/artworks/groups/delete/',
            add_to_group: window.api_root() + 'data/artworks/groups/add/',
            find_group: window.api_root() + 'data/artworks/groups/find/',
            get_related_artworks: window.api_root() + 'data/artworks/related/get/',
            add_related_artworks: window.api_root() + 'data/artworks/related/add/',
            remove_related_artworks: window.api_root() + 'data/artworks/related/remove/',
            get_online_sale_data: window.api_root() + 'data/online_sales/get_data_for_invoice/',
            delete_record: window.api_root() + 'data/shared/delete/',
            sort_records: window.api_root() + 'data/shared/sort_records/',
            get_conf_frontend_data: window.api_root() + 'data/conf/get_frontend_data',
            save_records: window.api_root() + 'data/shared/save_records',
            edit_market_intelligence: window.api_root() + 'data/market_intelligence/edit/',
            mini_create: window.api_root() + 'data/market_intelligence/mini_create/',
            get_market_intelligence: window.api_root() + 'data/market_intelligence/get/',
            event_tickets: window.api_root() + 'data/marketing_lists/',
            get_suggested_contacts: window.api_root() + 'conf/contacts/get_suggested_contacts/',
            email_bounce_management: window.api_root() + 'data/admin/email_bounce_management/',
            set_translation: window.api_root() + 'data/translation/set/',
            get_translation: window.api_root() + 'data/translation/get/',
            check_translation: window.api_root() + 'data/translation/check/',
            quick_add_contact: window.api_root() + 'data/contacts/quick_add/',
            update_image_details: window.api_root() + 'data/image_helpers/update-image-details/',
            get_bounce_data: window.api_root() + 'data/bounce_management/get_bounce_data/',
            reject_emails: window.api_root() + 'data/bounce_management/reject_emails/',
            allowlist: window.api_root() + 'data/bounce_management/allowlist/',
            send_allowlist_request: window.api_root() + 'data/bounce_management/send_allowlist_request/',
            get_rejected_emails: window.api_root() + 'data/modification_history/get_rejected_emails/',
            restore_rejected_emails: window.api_root() + 'data/bounce_management/restore_rejected_emails/',
            request_restore_rejected_emails: window.api_root() + 'data/modification_history/request_restore_rejected_emails/',
            get_pendo_additional_stats: window.api_root() + 'data/statistics/get_pendo_additional_stats/',
        },

        conf_api_url: function (conf_name, method) {
            return window.app.api_urls.conf_methods + conf_name + '/' + (method || '')
        },

        conf_api_call: function (options) {
            var that = this,
                settings = $.extend({
                    conf: window.conf ? window.conf.name : undefined
                }, options);

            return this.request({
                url: that.conf_api_url(settings.conf, settings.method),
                data: {
                    args: JSON.stringify(settings.args),
                    kwargs: JSON.stringify(settings.kwargs)
                },
                method: 'post'
            })
        },

        api_request: function (options) {

            /*
            *
            * API REQUEST
            * ===========
            *
            * Use this function to make server requests to the API
            *
            * Example
            * -------
            * window.app.api_request({
            *     endpoint: 'hello/robin'
            * }).then(function (response) {
            *     console.log(response);
            * });
            *
            *
            */

            var that = this,
                settings = $.extend({
                    url: window.api_root() + options.endpoint,
                    method: 'POST',
                    dataType: 'json'
                }, options, {data: {}});

            Object.keys(options.data || {}).forEach(function (key) {
                try {
                    settings.data[key] = JSON.stringify(options.data[key]);
                } catch (e) {
                    settings.data[key] = options.data[key];
                }
            });

            return this.request(settings);
        },

        set_client_pref: function(pref, value, gallery, callback, on_error=null) {

            var data = {};
            data[pref] = value;

            return this.set_client_prefs(data, gallery, callback, on_error);
        },

        set_client_prefs: function(data, gallery, callback, on_error=null) {

            data.gallery_id = gallery;

            return window.app.request({
                url: "/" + aol_prefs.site + "/api/data/preferences/set_client_pref",
                dataType: "json",
                method: "POST",
                data: data,
                success: callback,
                on_error: on_error
            });
        },

        apply_stats: function() {
            if (window.stats) {
                // window.stats are loaded from /<site>/api/stats/stats.js
                // we're looking for classes in the form 'nav_stats-<view_name>'
                if (window.stats.deadlines) {
                    var v, classname;
                    for (var k in window.stats.deadlines) {
                        v = window.stats.deadlines[k];
                        if (v && parseInt(v)) {
                            v = parseInt(v);
                            classname = 'nav_stats-' + k
                            $('.' + classname).html('<span class="nav_stats_badge">' + v + '</span>');
                        }
                    }
                }
            }
        },

        set_favicon: function(src) {
            $('#favicon-main').remove();
            $('head').append('<link id="favicon-main" rel="icon" href="' + src + '" type="image/x-icon" />');
        },

        set_favicon_to_changed: function() {
            // disabled for now...
            //this.set_favicon('/favicon-changed.ico');
            this.set_favicon('https://static.artlogic.net/favicon.ico');
        },

        set_favicon_to_main: function() {
            this.set_favicon('https://static.artlogic.net/favicon.ico');
        },

        get_current_list_view: function() {
            /** try to get the list view. if in a list it will be conf.view.
             *  if in edit page conf.view will be 'edit', view should be in the opener */
             if (conf.view == 'edit') {
                 if (window.opener && window.opener.conf) {
                     return window.opener.conf.view;
                 }
             } else {
                 return conf.view
             }
        },

        /////////////////
        // UNLOCK USER //
        /////////////////
        unlock_user: function (user_id, disable_2fa, support) {
            var url = support ? "/" + window.aol_prefs.site + "/public/api/support/unlock_user" : "/" + window.aol_prefs.site + "/api/data/users/unlock";
            disable_2fa = disable_2fa || 0;
            window.app.ui.loading_box();
            window.app.request({
                url: url,
                method: "POST",
                dataType: "json",
                data: {
                    user_id: user_id,
                    disable_2fa: disable_2fa
                },
                success: function(result) {
                    var title, content;
                    if (result.success) {
                        title = 'User unlocked';
                        content = '' +
                            'This user record was successfully unlocked and should be able to log in provided ' +
                            'they have correct credentials and other conditions for login are fulfilled.';
                        $("#user-locked-div").remove();
                    }
                    else {
                        title = 'User unlock failed';
                        content = '' +
                            'Sorry - there was a problem unlocking the user. If problems persist, please contact ' +
                            'us at <a href="mailto:support@artlogic.net">support@artlogic.net</a>';
                    }
                    window.aui.overlay_box.load({
                        title: title,
                        content: content,
                        box_width: '400px'
                    });
                    return;
                }
            });
            return;
        },

        //////////////////
        // SUPPORT MODE //
        //////////////////

        enable_support_mode: function() {
            var content = '<p>You are about to enable Support Mode. This will enable the Artlogic support team to access the system for a set period. For security compliance and accountability, please input a short description of the issue that help is needed for.</p><br>' +
            '<textarea style="width: 405px;height: 100px;" id="reason-input" placeholder="Please enter a short description of the issue..."></textarea><br>' +
            '<p>Enable support mode for:</p>' +
            '<label for="smt1" class="aui-custom-radio"><input type="radio" id="smt1" name="support_mode_timeout" value="1800" class="support_mode_timeout f-radio" checked> <span class="f-radio-label flabel">30 minutes</span></label><br>' +
            '<label for="smt2" class="aui-custom-radio"><input type="radio" id="smt2" name="support_mode_timeout" value="3600" class="support_mode_timeout f-radio"> <span class="f-radio-label flabel">1 hour</span></label><br>' +
            '<label for="smt3" class="aui-custom-radio"><input type="radio" id="smt3" name="support_mode_timeout" value="14400" class="support_mode_timeout f-radio"> <span class="f-radio-label flabel">4 hours</span></label><br>' +
            '<label for="smt4" class="aui-custom-radio"><input type="radio" id="smt4" name="support_mode_timeout" value="28800" class="support_mode_timeout f-radio"> <span class="f-radio-label flabel">8 hours</span></label><br>';
            aui.overlay_box.load({
                title: 'Enable support mode',
                content: content,
                box_width: '450px',
                buttons: [
                    {
                        label: "Cancel",
                        css_class: "aui-button-simple",
                        halign: "left"
                    },
                    {
                        label: "Enable now",
                        css_class: "aui-button-extra-round",
                        halign: "right",
                        callback: function() {
                            if ($("#reason-input").val() != "") {
                                app.toggle_support_mode(true, $("#reason-input").val(), $('.support_mode_timeout:checked').val()).then(function() {
                                    $("#btn-enable-support-mode").html('Disable support mode').attr('id', 'btn-disable-support-mode').attr('onclick', 'window.app.disable_support_mode()');
                                });
                                aui.overlay_box.close();
                            }
                            else {
                                h.alert('Missing information', 'Please input a specific issue as a reason for enabling the support mode.')
                            }
                        }
                    }
                ]
            });
        },

        disable_support_mode: function() {
            h.confirm({
                msg: 'This will disable the Support Mode and prevent the Artlogic Support Team accessing your system to assist you.',
                callback: function() {
                    app.toggle_support_mode(false).success(function() {
                        $("#btn-disable-support-mode").html('Enable support mode').attr('id', 'btn-enable-support-mode').attr('onclick', 'window.app.enable_support_mode()');
                    });
                }
            });
        },

        toggle_support_mode: function(enable, reason, timeout) {
            var enable = enable ? 1 : 0,
                disable = enable ? 0 : 1,
                reason = reason || null;
                timeout = parseInt(timeout || 0);
            return app.request({
                url: '/' + aol_prefs.site + '/api/data/support',
                method: 'POST',
                dataType: 'json',
                data: {
                    enable: enable,
                    disable: disable,
                    reason: reason,
                    timeout: timeout
                }
            });
        },



        /* Confirm mailing

        This function launches an overlay box with an email preview for each
        contact. It allows the user to double check names when sending mass
        emails. It also works as a data cleaning tool, as it quickly indicates
        which contacts are missing name/override details.

        This funcion doesn't actually handle the email sending process, only
        rejects() or resolves() a Deferred object, which should allow this tool
        to be used in multiple contexts without much difficulty.

        use this function like:

            >> params = {
                ids: [1, 2, 3],
                email_content: 'I hope you do',
                email_subject: 'Do you like Capybaras?'.
                mailing_type: 'campaign'
            };
            >> window.app.confirm_mailing(params).then(function () {
                send_email();
            }).fail(function () {
                do_something_else();
            });

        or alternatively use a request id:

            >> window.app.confirm_mailing({
                request_id: 'e08515b48e8e0bcf4c1475e8b5151e76',
                email_content: 'Hello world'
            });

        instead of sending email_content we can send a campaign id (for mailings)..

            >> window.app.confirm_mailing({
                request_id: 'e08515b48e8e0bcf4c1475e8b5151e76',
                campaign_id: 54
            });

        */
        confirm_mailing: (function () {

            function init (params) {

                init.main_promise = $.Deferred();

                if (typeof(params) === 'undefined') {
                    load();
                }

                /* The array of contact ids to load */
                init.contact_ids = params.ids;

                /* Alternatively we can use a request id to get the contacts
                instead of sending an array */
                init.request_id = params.request_id;

                /* We need to know what type of mailing this is so we know
                what fields to check for when we validate the email addresses e.g.
                - user_does_not_want_offer_emails
                - user_does_not_want_general_emails
                - user_does_not_want_newsletters
                valid mailing_types are 'offer', 'general', 'newsletter' */
                init.mailing_type = params.mailing_type;

                /* The html that we are going to email, including placeholders.
                Either send the email content directly or get it from the campaign_id */
                var campaign_text_promise = $.Deferred();
                if (params.campaign_id) {
                    get_content_from_campaign(params.campaign_id).done(function (result) {
                        init.email_content = result.email_content;
                        init.email_subject = result.email_subject;
                        campaign_text_promise.resolve();
                    });
                } else {
                    init.email_content = params.email_content;
                    init.email_subject = params.email_subject;
                    campaign_text_promise.resolve();
                }

                /* Turn this on when we're loading rows so we don't repeat the
                same requests */
                init.loading = false;

                /* Once we've loading all the contacts we set this to true */
                init.finished_loading = false;

                /* This boolean value is toggled when we want to view only the
                contacts without name data */
                init.valid_contacts_hidden = false;

                /* The number of rows currently in the dialog */
                init.current_length = 0;

                $.when(campaign_text_promise).done(function () {
                    load();
                });

                return init.main_promise;
            }


            function load () {

                init.current_length = 0;
                init.finished_loading = false;

                if (init.loading) {
                    return;
                }

                load_html().then(function (html) {
                    init.loading = false;

                    if (init.current_length) {
                        $('#confirm_mailing .aui-overlay-box-content').html(html);
                        event_handlers();
                    } else {
                        launch_overlay(html);
                    }
                });
            }

            function load_html () {
                return window.app.request({
                    url: '/' + window.aol_prefs.site + '/shared/confirm_mailing',
                    method: 'POST',
                    dataType: 'html',
                    data: {
                        'contacts': JSON.stringify(init.contact_ids),
                        'request_id': JSON.stringify(init.request_id),
                        'email_content': init.email_content,
                        'email_subject': init.email_subject,
                        'valid_contacts_hidden': init.valid_contacts_hidden,
                        'current_length': init.current_length,
                        'mailing_type': init.mailing_type
                    },
                });
            }

            function launch_overlay (html) {
                var count = 0;
                var success = false;

                window.aui.overlay_box.load({
                    title: 'Confirm and send',
                    content: html,
                    id: 'confirm_mailing',
                    box_width: '1100px',
                    buttons: [
                        {
                            label: 'Send now',
                            halign: 'right',
                            css_class: 'aui-button-extra-round confirm-email-btn-text not-for-demo' + (window.aol_prefs.site === 'artlogiconline' ? ' aui-disabled' : ''),
                            callback: function () {
                                if (count != 0 && window.aol_prefs.site !== 'artlogiconline') {
                                    success = true;
                                }
                                window.aui.overlay_box.close('confirm_mailing');
                            }
                        },
                        {
                            label: 'Cancel',
                            halign: 'left',
                            css_class: 'aui-button-simple',
                        }
                    ],
                    on_load: function () {
                        count = $('#total-contacts-count').val();
                        if (count == 0) {
                            $('.confirm-email-btn-text').addClass('aui-disabled').attr('disabled', true);
                        } else if (count == 1) {
                            $('.confirm-email-btn-text').text('Send now to one contact');
                        } else {
                            $('.confirm-email-btn-text').text('Send now to ' + count + ' contacts');
                        }

                        event_handlers();
                    },
                    on_close: function () {
                        if (success) {
                            init.main_promise.resolve();
                        } else {
                            init.main_promise.reject();
                        }
                    },
                    close_on_click_outside: false
                });

            }

            function load_more_rows () {

                init.current_length = $('.recipient-row').length;

                /* Return if we've loaded everything */
                if (init.finished_loading) {
                    $('.loading-more-recipients').hide();
                    return;
                }

                /* If we're currently loading more rows, return early */
                if (init.loading) {
                    return;
                }

                /* Show the loading spinner */
                $('.loading-more-recipients').show();

                init.loading = true;
                load_html().then(function (html) {
                    init.loading = false;
                    if (!html.trim().length) {
                        init.finished_loading = true;
                        $('.loading-more-recipients').hide();
                        return;
                    }
                    $('.loading-more-recipients').before(html);
                    event_handlers();
                });
            }

            function event_handlers () {

                $('#hide-valid-contacts').off('click').on('click', function () {
                    hide_valid_contacts();
                });

                $('#show-valid-contacts').off('click').on('click', function () {
                    show_valid_contacts();
                });

                $('.edit-contact').off('click').on('click', function (event) {
                    event.stopPropagation();
                    var contact_id = $(this).data('id');
                    window.app.quick_edit_contact(contact_id).then(function () {
                        load();
                    });
                });

                $('.recipient-row').off('click').on('click', function () {
                    expand_row($(this));
                });

                $('.recipients').unbind('scroll').bind('scroll', function () {
                    if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight - 1000) {
                        load_more_rows();
                    }
                });
            }

            function hide_valid_contacts () {
                init.valid_contacts_hidden = true;
                load();
            }

            function show_valid_contacts () {
                init.valid_contacts_hidden = false;
                load();
            }

            function expand_row (row) {

                if (row.find('.recipient-col').hasClass('expanded')) {
                    $('.recipient-col.expanded').removeClass('expanded');
                    return;
                }

                $('.recipient-col.expanded').removeClass('expanded');

                row.find('.recipient-col').each(function () {
                    $(this).addClass('expanded');
                });
            }

            function get_content_from_campaign (campaign_id) {
                var promise = $.Deferred();
                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/mailing_campaigns/get_content',
                    method: 'POST',
                    dataType: 'json',
                    data: {
                        campaign_id: campaign_id
                    },
                    success: function (result) {
                        /* get the text and strip excess whitespace */
                        var email_content = $('<div>' + result.email_content + '</div>').find('.mailing-main-wrapper').text().replace(/\s+/g, ' ');
                        promise.resolve({
                            email_content: email_content,
                            email_subject: result.email_subject
                        });
                    }
                });

                return promise;
            }

            return init;

        }()),
        save_record_sort_order: (function (rec_ids) {
            var conf = this.conf;
            return window.app.request({
                url: window.app.api_urls.sort_records,
                // data: {_conf: JSON.stringify(window.conf), conf_name: window.conf.name, rec_ids: JSON.stringify(rec_ids)},
                data: {conf_name: conf, rec_ids: JSON.stringify(rec_ids)},
                method: 'POST',
                dataType: 'json'
            });
        }),
        reorder_records: (function(options) {
            /*
                From window.browse.reorder_records — reorder the provided record IDs.
            */
            window.app.template.load("/lib/aol/records/shared/templates/list.html");
            var site_name = window.app.state.site,
                conf = options.conf,
                records_per_page = options.records_per_page ? options.records_per_page : 52; // try to get all (for collections) or default page results
            if (!site_name && !conf) {
                return;
            }
            var that = this,
                settings = $.extend({
                    on_save: this.save_record_sort_order
                }, options),
                get_ids = function () {
                    var ids = [];
                    $("#aol-sort-records-container .aui-item[data-id]").each(function() {
                        var id = $(this).data('id');
                        ids.push(id);
                    });
                    return ids;
                };

            window.app.ui.loading_box();

            this.sort_record_list = window.app.list(conf, $.extend(true, {}, {
                post_data: {
                    view: 'main', // all?
                    view_params: [site_name, 'records', conf],
                    sort_option: 'custom',
                    records_per_page: records_per_page
                },
                //data: data,
                layout_override: {
                    sortable: true,
                    item_menu: {
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
                                label: 'Move item to top',
                                onclick: function (event, button, item, grid) {
                                    grid.move_items(0, [item.get_index()], 'before');
                                },
                                show: function (item, grid) {
                                    return !grid.selected_items().length || item.selected();
                                }
                            },
                            {
                                label: 'Move item to bottom',
                                onclick: function (event, button, item, grid) {
                                    grid.move_items(grid.data.rows.length - 1, [item.get_index()], 'after');
                                },
                                show: function (item, grid) {
                                    return !grid.selected_items().length || item.selected();
                                }
                            }
                        ]
                    },
                    // on_sortable_update: function(grid_instance) {
                        /*
                        This function is run automatically when the grid has been updated via drag and drop
                        An example of this used is on change of the sort order and adding/removing artworks
                        from the a PrivateView.
                        */
                    //     //that.update_selected_works_field();
                    // }
                }
            }, settings.list_settings));

            this.sort_record_list.then(function(list) {
                var html;
                $('body').append('<div id="aol-sort-records-container" style="display: none;"></div>');
                list.render('#aol-sort-records-container', 'default');
                html = $('#aol-sort-records-container').html();
                $('#aol-sort-records-container').remove();

                var content = '<div id="aol-sort-records-container">'+ html + '</div>';

                if (settings.list_settings.description) {
                    content = '<p>' + settings.list_settings.description + '</p>' + content;
                }

                window.app.ui.popup.load({
                    title: 'Sort records',
                    content: content,
                    box_width: 600,
                    on_load: function () {
                        list.render('#aol-sort-records-container', 'default');
                    },
                    buttons: [
                        {
                            label: 'Cancel',
                            halign: 'right',
                            css_class: 'aui-button-simple',
                            cancel: true
                        },
                        {
                            label: 'Save',
                            halign: 'right',
                            callback: function () {
                                if (settings.on_save) {
                                    window.app.ui.loading_box({
                                        title: 'Saving...'
                                    });
                                    settings.on_save(get_ids()).then(function () {
                                        $('#edit_form').submit(); // to save the collection sort order preference to 'privateviews-sync-settings'
                                        window.app.ui.popup.close();
                                        // window.app.state
                                        // if (window.browse.main_list.state.current.sort_option == 'custom') {
                                            // window.browse.main_list.reload();
                                        // }
                                    });
                                }
                            }
                        }
                    ]
                });
            });
        }),

        /* Quick edit contact

        This launches a small overlaybox that allows you to edit the core
        details of a contact.

        To use:

            >> window.app.quick_edit_contact(contact_id).then(function () {
                // saved
            }).fail(function () {
                // canceled
            });
        */
        quick_edit_contact: (function () {

            function init (contact_id) {
                var promise = $.Deferred();
                load_html(contact_id).then(function (html) {
                    open_dialog(html).then(function () {
                        promise.resolve();
                    });
                });
                return promise;

            }

            function load_html (contact_id) {
                return window.app.request({
                    url: '/' + window.aol_prefs.site + '/records/contacts/quick_edit',
                    method: 'POST',
                    dataType: 'html',
                    data: {
                        'contact_id': contact_id
                    },
                });
            }

            function open_dialog (html) {

                var promise = $.Deferred();

                window.aui.overlay_box.load({
                    id: 'edit_contact',
                    title: 'Edit contact',
                    content: html,
                    box_width: '700px',
                    buttons: [
                        {
                            label: 'Cancel',
                            halign: 'left',
                            css_class: 'aui-button-simple',
                            close: true,
                            callback: function () {
                                window.aui.overlay_box.close('edit_contact');
                                promise.reject();
                            }
                        },
                        {
                            label: 'Save',
                            halign: 'right',
                            css_class: 'aui-button-extra-round',
                            callback: function () {
                                save().then(function () {
                                    window.aui.overlay_box.close('edit_contact');
                                    promise.resolve();
                                });
                            }
                        },
                    ],
                    close_on_click_outside: false
                });

                return promise;
            }

            function save () {
                var form_data = $('#contact-info-form').serializeArray();
                var save_data = {_save: 1};
                var contact_id = $('#contact_id').attr('value');

                for (var i = 0; i < form_data.length; i++) {
                    save_data['contacts-' + contact_id + '-' + form_data[i].name] = form_data[i].value;
                }

                return window.app.request({
                    url: window.app.api_urls.save,
                    method: 'POST',
                    data: save_data,
                    dataType: 'json',
                });
            }

            return init;

        }()),

        change_profile_picture: (function () {

            function init (user_id) {
                init.promise = $.Deferred();
                init.user_id = user_id || window.page_settings.user.id;
                launch_overlay();
                return init.promise;
            }

            function launch_overlay () {

                window.aui.overlay_box.load({
                    title: 'Edit profile picture',
                    css_class: 'change-profile-picture-overlay',
                    content: get_html(),
                    box_width: '500px',
                    text_align: 'center',
                    show_close_button: true,
                    buttons: [
                        {
                            label: 'Upload image',
                            halign: 'center',
                            css_class: 'aui-button-extra-round upload-button',
                            callback: function () {
                                $('#change_profile_picture_input').click();
                            }
                        },
                    ],
                    callback: function () {
                        event_handlers();
                    }
                });
            }

            function event_handlers () {
                $('#change_profile_picture_input').off('change').on('change', function () {
                    upload_file(this);
                });
            }

            function get_html () {
                return window.app.template.get('change_profile_picture')({
                    site: window.aol_prefs.site,
                    user_id: init.user_id
                });
            }

            function upload_file (file_element) {

                $('.upload-button').addClass('aui-button-loading').attr('disabled', true);

                var form_data = new FormData;
                var file = file_element.files[0];

                form_data.append('import_file', file);
                form_data.append('user_id', init.user_id);

                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/change_profile_picture',
                    dataType: 'json',
                    method: 'POST',
                    data: form_data,
                    cache: false,
                    processData: false,
                    contentType: false,
                    success: function (result) {
                        update(result['image_uid']);
                    }
                });
            }

            function update (image_uid) {
                var i = window.aol_prefs.users.map.length;
                while (i--) {
                    if (window.aol_prefs.users.map[i].id == init.user_id) {
                        window.aol_prefs.users.map[i].image_uid = image_uid;
                        $('.change-profile-picture-overlay .aui-overlay-box-content').html(get_html());
                        $('.upload-button').removeClass('aui-button-loading').attr('disabled', false);
                        event_handlers();
                        init.promise.resolve();
                        init.promise = $.Deferred();
                        return;
                    }
                }
            }

            return init;
        })(),

        homepage_banner_settings: {
            image_overlay_colour: '',
            banner_focal_point: '',
            title_text_colour: '',
            date_text_colour: '',
            image_uid: '',
            theme: ''
        },

        default_site_banner_settings: {
            image_overlay_colour: '',
            banner_focal_point: '',
            title_text_colour: '',
            date_text_colour: '',
            image_uid: '',
            theme: ''
        },


        change_user_homepage_banner: (function () {

            function init (user_id) {
                init.promise = $.Deferred();
                init.user_id = user_id || window.page_settings.user.id;
                if (!window.app.homepage_banner_settings.image_uid) {
                    init_user_banner_settings();
                }
                launch_overlay();
                return init.promise;
            }

            function launch_overlay () {

                window.aui.overlay_box.load({
                    title: 'Edit my homepage banner',
                    css_class: 'change-homepage-banner-overlay',
                    content: get_change_homepage_banner_html(),
                    box_width: '1200px',
                    show_close_button: true,
                    close_on_click_outside: false,
                    buttons: [
                        {
                            label: 'Cancel',
                            halign: 'right',
                            css_class: 'aui-btn-secondary cancel-homepage'
                        },
                        {
                            label: 'Save settings',
                            halign: 'left',
                            css_class: 'aui-button-extra-round save-settings',
                            callback: function () {
                                save_settings();
                            }
                        },
                        {
                            label: 'Save & Close',
                            halign: 'left',
                            css_class: 'aui-btn-secondary ml10',
                            callback: function () {
                                save_settings();
                                window.aui.overlay_box.close(null, $('.change-homepage-banner-overlay'));
                            }
                        },
                    ],
                    callback: function () {
                        // toggle relevant fields
                        if (window.app.homepage_banner_settings.image_uid) {
                            toggle_related_banner_img_fields(true);
                        } else {
                            toggle_related_banner_img_fields(false);
                        };
                        // init the image overlay field...
                        window.fieldhelpers.color.init();
                        // load saved settings
                        event_handlers();
                    },
                    on_close: function() {
                        $('.sp-container').remove();
                    },
                    on_load: function() {
                        if (!window.app.homepage_banner_settings.title_text_colour || !window.app.homepage_banner_settings.title_text_colour == '#1D2933' ) {
                            $('.user_homepage_banner_overlay .title').css('color', '#1D2933');
                        }
                        if (!window.app.homepage_banner_settings.date_text_colour || !window.app.homepage_banner_settings.date_text_colour == '#AAA' ) {
                            $('.user_homepage_banner_overlay .date').css('color', '#AAA');
                        }
                    }

                });
            }

            function event_handlers() {

                $('.change-homepage-banner-overlay').find('.aui-icon-cross, .cancel-homepage').off('click').on('click', function(e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if ($('.change-homepage-banner-overlay .save-settings').hasClass('aui-button-highlighted')) {
                        window.h.confirm({
                            title: 'You have unsaved changes',
                            msg: 'If you close this overlay without saving you will lose all unsaved changes',
                            ok_label: 'Save changes',
                            cancel_label: 'Close without saving',
                        }).then(function() {
                            save_settings();
                            window.aui.overlay_box.close(null, $('.change-homepage-banner-overlay'));
                        }, function() {
                            window.aui.overlay_box.close(null, $('.change-homepage-banner-overlay'));
                        });
                    } else {
                        window.aui.overlay_box.close(null, $('.change-homepage-banner-overlay'));
                    }
                });
                // banner image
                $('#change_homepage_banner_input').off('change').on('change', function () {
                    upload_file(this);
                });

                $('body').off('click', '.upload-button').on('click', '.upload-button', function() {
                    $('#change_homepage_banner_input').click();
                });

                $('body').on('click', '.homepage-banner-remove-image-btn', function(event) {
                    // remove hidden sorce for focalpoint selection...
                    $('.change-homepage-banner-overlay .user-banner-image').css('background-image', 'url()').css('background-position', '50.0% 50.0%');
                    $('.change-homepage-banner-overlay .image-url-placeholder').attr('src', '');
                    $('.change-homepage-banner-overlay .image-url-placeholder').attr('image_uid', '');
                    $('#homepage-overlay-customisations').remove();
                    $('[id^="override-change-homepage-banner-overlay"]').remove();
                    $('#homepage_banner_title_colour').parent().find('.sp-preview-inner').css('background-color', '#1D2933');
                    $('#homepage_banner_date_colour').parent().find('.sp-preview-inner').css('background-color', '#AAA');
                    $('#homepage_banner_overlay_colour').parent().find('.sp-preview-inner').css('background-color', 'rgba(0, 0, 0, 0)');
                    $('.banner-image-title').find('.title').css('color', '#1D2933');
                    $('.banner-image-title').find('.date').css('color', '#AAA');
                    toggle_related_banner_img_fields(false);
                    // set the banner image_uid and reset focal points
                    // window.app.homepage_banner_settings.image_uid = '';
                    // window.app.homepage_banner_settings.banner_focal_point_x = '';
                    // window.app.homepage_banner_settings.banner_focal_point_y = '';
                    // requires saving
                    $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                });


                var overlay_target = $('div.homepage_banner_overlay_colour .sp-preview-inner')[0]

                var overlay_observer = new MutationObserver(function(mutations) {

                  mutations.forEach(function(mutation) {
                    let overlay_style = mutation.target.attributes.style.nodeValue.replace(';', '').replace(' ', '').split(':');
                    let value = overlay_style[1]
                    override_pseudo_element('.change-homepage-banner-overlay .user-banner-image', {'background-color': value}, 'after');
                  });
                });

                overlay_observer.observe(overlay_target, {'attributes': true})


                // image overlay
                $('#homepage_banner_overlay_colour').off('change').on('change', function () {
                    // // window.app.homepage_banner_settings.image_overlay_colour = $('div.homepage_banner_overlay_colour .sp-preview-inner').css('background-color');
                    // override_pseudo_element('.change-homepage-banner-overlay .user-banner-image', {'background-color' : $('div.homepage_banner_overlay_colour .sp-preview-inner').css('background-color')}, 'after');
                    // // requires saving
                    $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                });

                var title_target = $('div.homepage_banner_title_colour .sp-preview-inner')[0]

                var title_observer = new MutationObserver(function(mutations) {

                  mutations.forEach(function(mutation) {
                    let title_style = mutation.target.attributes.style.nodeValue.replace(';', '').replace(' ', '').split(':');
                    let value = title_style[1];
                    $('.change-homepage-banner-overlay .title').css('color', value);
                  });
                });

                title_observer.observe(title_target, {'attributes': true})


                // text and date colour...
                $('#homepage_banner_title_colour').off('change').on('change', function () {
                    // // window.app.homepage_banner_settings.title_text_colour = $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color');
                    // $('.change-homepage-banner-overlay .title').css('color', $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color'));
                    // // requires saving
                    $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                });

                var date_target = $('div.homepage_banner_date_colour .sp-preview-inner')[0]

                var date_observer = new MutationObserver(function(mutations) {

                  mutations.forEach(function(mutation) {
                    let date_style = mutation.target.attributes.style.nodeValue.replace(';', '').replace(' ', '').split(':');
                    let value = date_style[1];
                    $('.change-homepage-banner-overlay .date').css('color', value);
                  });
                });

                date_observer.observe(date_target, {'attributes': true})


                $('#homepage_banner_date_colour').off('change').on('change', function () {
                    // // window.app.homepage_banner_settings.date_text_colour = $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color');
                    // $('.change-homepage-banner-overlay .date').css('color', $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color'));
                    // // requires saving
                    $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                });


                // image focalpoint
                $('body').off('click', '.homepage-banner-focalpoint-btn').on('click', '.homepage-banner-focalpoint-btn', function () {
                    $(this).stickyBox('<div id="focalpoint-container"></div><div class="fnote hidden">Move the circle to change which part of the image is displayed.</div>', {
                        //z_index: 99999,
                        padding: '10px',
                        width: 200,
                        on_load: function () {
                            // var settings = that.get_current_settings();
                            var initial_x = window.app.homepage_banner_settings.banner_focal_point_x ? window.app.homepage_banner_settings.banner_focal_point_x : 50.0;
                            var initial_y = window.app.homepage_banner_settings.banner_focal_point_y ? window.app.homepage_banner_settings.banner_focal_point_y : 50.0
                            $('#focalpoint-container').focalpoint({
                                image_url: $('.change-homepage-banner-overlay .image-url-placeholder').attr('src'),
                                initial_x: initial_x,
                                initial_y:  initial_y,
                                on_change: function (x, y) {
                                    // set focalpoint in UI
                                    $('.change-homepage-banner-overlay .user-banner-image').css('background-position', x + '% ' + y + '%');
                                    // update prefs...
                                    window.app.homepage_banner_settings.banner_focal_point_x = x;
                                    window.app.homepage_banner_settings.banner_focal_point_y = y;
                                    // requires saving
                                    if ((initial_x != x) || (initial_y != y)) {
                                        $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                                    }
                                }
                            });
                        }
                    });
                });
            }

            function get_change_homepage_banner_html() {
                // loads the change_homepage_banner template
                var focal_point_x = window.app.homepage_banner_settings.banner_focal_point_x,
                    focal_point_y = window.app.homepage_banner_settings.banner_focal_point_y,
                    image_uid = window.app.homepage_banner_settings.image_uid,
                    banner_image_url = image_uid ? window.h.image_urls.best(image_uid): '',
                    today = new Date(),
                    today_string = $.jcal.month_names[today.getMonth()] + " " + today.getDate().toString() + ", " + today.getFullYear().toString();

                return window.app.template.get('change_homepage_banner')({
                    site: window.aol_prefs.site,
                    site_name: window.aol_prefs.site_name,
                    date_today: today_string,
                    user_id: init.user_id,
                    overlay_colour: window.app.homepage_banner_settings.image_overlay_colour,
                    background_colour: window.app.homepage_banner_settings.banner_background_colour,
                    title_colour: window.app.homepage_banner_settings.title_text_colour,
                    date_colour: window.app.homepage_banner_settings.date_text_colour,
                    user_homepage_banner_image_url: banner_image_url,
                    user_homepage_banner_image_uid: image_uid,
                    focal_point_x: focal_point_x,
                    focal_point_y: focal_point_y,
                    has_focal_points: (focal_point_x && focal_point_y) ? true : false,
                });
            }

            function upload_file(file_element) {
                // upload banner image
                var form_data = new FormData,
                    file = file_element.files[0];
                form_data.append('import_file', file);
                form_data.append('user_id', init.user_id);
                $('.change-homepage-banner-overlay .upload-button').addClass('aui-button-loading').attr('disabled', true);

                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/change_homepage_banner',
                    dataType: 'json',
                    method: 'POST',
                    cache: false,
                    processData: false,
                    contentType: false,
                    data: form_data,
                    success: function (result) {
                        var image_uid = result['homepage_banner_uid'],
                            image_url = window.h.image_urls.best(image_uid);
                        // window.app.homepage_banner_settings.image_uid = image_uid;
                        // reflect in the UI
                        $('.change-homepage-banner-overlay .user-banner-image').css('background-image', 'url(\'' + image_url + '\')');
                        $('.change-homepage-banner-overlay .image-url-placeholder').attr('src', image_url);
                        $('.change-homepage-banner-overlay .image-url-placeholder').attr('image_uid', image_uid);
                        $('[id^="override-change-homepage-banner-overlay"]').remove();
                        $('.change-homepage-banner-overlay .upload-button').removeClass('aui-button-loading').attr('disabled', false);
                        toggle_related_banner_img_fields(true);
                        // requires saving
                        $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                    }
                });
            }

            function toggle_related_banner_img_fields(show) {
                // show or hide fields related to the banner image being set
                if (show) {
                    $('.banner-img-toggle-show').removeClass('hidden');
                    $('.banner-img-toggle-hide').addClass('hidden');
                } else {
                    $('.banner-img-toggle-show').addClass('hidden');
                    $('.banner-img-toggle-hide').removeClass('hidden');
                }
            }

            function update_user_banner_settings (user_id) {
                // update the banner settings on the homepage
                // of course... we may not be on that page!
                var image_uid = window.app.homepage_banner_settings.image_uid,
                    image_url = image_uid ? window.h.image_urls.best(image_uid) : '',
                    focal_point_y = window.app.homepage_banner_settings.banner_focal_point_y,
                    focal_point_x = window.app.homepage_banner_settings.banner_focal_point_x,
                    background_position = (focal_point_y && focal_point_x) ? focal_point_x + '% ' + (focal_point_y >= 5 ? focal_point_y - 5 : 0)  + '%'  : '50.0% 50.0%',
                    image_overlay_colour = window.app.homepage_banner_settings.image_overlay_colour,
                    // background_colour = window.app.homepage_banner_settings.banner_background_colour,
                    title_colour = window.app.homepage_banner_settings.title_text_colour,
                    date_colour = window.app.homepage_banner_settings.date_text_colour,
                    use_default_banner;
                    var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
                if (!image_url) {
                    var default_banner_set_for_current_theme = current_theme in window.aol_prefs.default_site_banner_settings ? !!window.aol_prefs.default_site_banner_settings[current_theme].image_uid : false
                    if (default_banner_set_for_current_theme) {
                        window.app.default_site_banner_settings = window.aol_prefs.default_site_banner_settings[current_theme];
                    }
                    var default_site_img_uid = window.app.default_site_banner_settings.image_uid;
                    var default_site_img_url = default_site_img_uid ? window.h.image_urls.best(default_site_img_uid) : '';
                    if (default_site_img_url) {
                        use_default_banner = true;
                        focal_point_y = window.app.default_site_banner_settings.banner_focal_point_y,
                        focal_point_x = window.app.default_site_banner_settings.banner_focal_point_x,
                        background_position = (focal_point_y && focal_point_x) ? focal_point_x + '% ' + (focal_point_y >= 5 ? focal_point_y - 5 : 0)  + '%'  : '50.0% 50.0%',
                        image_url = default_site_img_url;
                        image_overlay_colour = window.app.default_site_banner_settings.image_overlay_colour,
                        // background_colour = window.app.default_site_banner_settings.banner_background_colour,
                        title_colour = window.app.default_site_banner_settings.title_text_colour,
                        date_colour = window.app.default_site_banner_settings.date_text_colour;
                    }
                }

                    // offset the y-axis by 5% to account space taken by the nav menu bar
                if (image_url) {
                    $('.homepage-banner').css(
                            'background-image', 'url(\'' + image_url + '\')')
                        .css(
                            'background-position', background_position)
                        .css(
                            'height', '320px');

                    // var title_colour = $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color')
                    // var date_colour = $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color')

                    title_colour = title_colour == 'rgba(0, 0, 0, 0)' ? (current_theme == 'dark' ? '#FFF' : '#1D2933') : title_colour;
                    date_colour = date_colour == 'rgba(0, 0, 0, 0)' ? (current_theme == 'dark' ? '#DDD' : '#AAA') : date_colour;


                    $('.homepage-title span.title').css('color', title_colour);
                    $('.homepage-title span.date').css('color', date_colour);
                    override_pseudo_element('.homepage-banner', {'background-color' : image_overlay_colour}, 'after');
                } else {
                    // our standard / default image... url('../../../images/homepage/background.jpg');
                    $('.homepage-banner').css('background-image', '').css('background-position', '');
                    override_pseudo_element('.homepage-banner', {'background-color' : ''}, 'after');
                    $('.homepage-title span.title').css('color', (current_theme == 'dark' ? '#FFF' : '#1D2933'));
                    $('.homepage-title span.date').css('color', (current_theme == 'dark' ? '#FFF' : '#1D2933'));

                    if (window.matchMedia("(max-height: 800px)").matches) {
                        $('.homepage-banner').css('height', '240px')
                    } else {
                        $('.homepage-banner').css('height', '320px');
                    }
                };
            }

            function init_user_banner_settings (user_id) {
                // set the user banner settings to the `homepage_banner_settings` obj
                var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
                var i = window.aol_prefs.users.map.length;
                while (i--) {
                    if (window.aol_prefs.users.map[i].id == init.user_id) {
                        if (window.aol_prefs.users.map[i].homepage_banner_details[current_theme]) {
                            window.app.homepage_banner_settings = window.aol_prefs.users.map[i].homepage_banner_details[current_theme]
                        }
                        return;
                    }
                }
            }

            function update_user_pref_banner_object (set_for_alt_theme) {
                var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
                var i = window.aol_prefs.users.map.length;
                while (i--) {
                    if (window.aol_prefs.users.map[i].id == init.user_id) {
                        if (set_for_alt_theme) {
                            window.aol_prefs.users.map[i].homepage_banner_details['light'] = window.app.homepage_banner_settings;
                            window.aol_prefs.users.map[i].homepage_banner_details['dark'] = window.app.homepage_banner_settings;
                        } else {
                            window.aol_prefs.users.map[i].homepage_banner_details[current_theme] = window.app.homepage_banner_settings;
                        }
                        return;
                    }
                }
            }

            function save_settings () {
                $('.save-settings').addClass('aui-button-loading').attr('disabled', true);
                var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
                var form_data = new FormData;
                //form_data.append('user_id', init.user_id);
                window.app.homepage_banner_settings.date_text_colour = $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color') == 'rgba(0, 0, 0, 0)' ? '#AAA' : $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color');
                window.app.homepage_banner_settings.title_text_colour = $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color') == 'rgba(0, 0, 0, 0)' ? '#1D2933' : $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color');;
                window.app.homepage_banner_settings.image_overlay_colour = $('div.homepage_banner_overlay_colour .sp-preview-inner').css('background-color');
                window.app.homepage_banner_settings.theme = parseInt($('#user_banner_theme').val()) ? 'all' : current_theme;

                if (!$('.change-homepage-banner-overlay .image-url-placeholder').attr('src')) {
                    window.app.homepage_banner_settings.image_uid = '';
                    window.app.homepage_banner_settings.banner_focal_point_x = '';
                    window.app.homepage_banner_settings.banner_focal_point_y = '';
                    window.app.homepage_banner_settings.image_overlay_colour = '';
                    window.app.homepage_banner_settings.title_text_colour = '#1D2933';
                    window.app.homepage_banner_settings.date_text_colour = '#AAA';
                } else {
                    window.app.homepage_banner_settings.image_uid = $('.change-homepage-banner-overlay .image-url-placeholder').attr('image_uid');
                }

                form_data.append('banner_settings', 1);
                form_data.append('image_overlay_colour', window.app.homepage_banner_settings.image_overlay_colour);
                form_data.append('title_text_colour', window.app.homepage_banner_settings.title_text_colour);
                form_data.append('date_text_colour', window.app.homepage_banner_settings.date_text_colour);
                form_data.append('banner_focal_point_y', window.app.homepage_banner_settings.banner_focal_point_y);
                form_data.append('banner_focal_point_x', window.app.homepage_banner_settings.banner_focal_point_x);
                form_data.append('image_uid', window.app.homepage_banner_settings.image_uid);
                form_data.append('theme', window.app.homepage_banner_settings.theme);

                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/change_homepage_banner',
                    dataType: 'json',
                    method: 'POST',
                    data: form_data,
                    cache: false,
                    processData: false,
                    contentType: false,
                    success: function (result) {
                        $('.save-settings').removeClass('aui-button-loading').removeClass('aui-button-highlighted').attr('disabled', false);
                        window.h.notify("Your settings were successfully saved");
                        window.app.homepage_banner_settings.theme == 'all' ? update_user_pref_banner_object(true) : update_user_pref_banner_object(false);
                        update_user_banner_settings(init.user_id);
                        if (!window.app.homepage_banner_settings.image_uid) {
                            $('style#homepage-customisations').remove();
                            $('.homepage-title span.title').removeClass('override-applied');
                            $('.homepage-title span.date').removeClass('override-applied');
                            $('.homepage-banner').removeClass('override-applied');
                        }
                    }
                });
            }

            function override_pseudo_element (selector, styles, pseudo_el) {
                // example args:
                // - selector: ".myThing" or "#myThin"
                // - styles: {'color' : 'red', 'background-color' : 'blue'}
                // - pseudo_el: 'before' or 'after'
                // pseudo_element's such as :before and :after cannot be modified on-the-fly
                // instead we add a temporary stylesheet a recognisable id
                // this is only for on-the-fly manipulations...
                var override_id = 'override-' + selector.replaceAll('.', '').replaceAll('#', '').replaceAll(' ', ''),
                    override_styles = '';
                // remove any existing
                $('style#' + override_id).remove();
                // $('style#homepage-customisations').remove();
                // add new style
                $.each(styles,function(k,v)
                    {
                        override_styles += (k + ':' + v + ';')
                    }
                );
                $('body').append('<style id="' + override_id + '">' + selector + '::' + pseudo_el + '{' + override_styles + '}</style>')
            }

            return init;
        })(),

        change_default_site_banner: (function () {

            function init (user_id) {
                init.promise = $.Deferred();
                init.user_id = user_id || window.page_settings.user.id;
                if (!window.app.default_site_banner_settings.image_uid) { //this will be on first load
                    var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
                    try {
                        if (window.aol_prefs.default_site_banner_settings[current_theme].image_uid) {
                            window.app.default_site_banner_settings = window.aol_prefs.default_site_banner_settings[current_theme]
                        }
                    } catch (e) {
                        // may get a TypeError if window.aol_prefs.default_site_banner_settings doesn't have an image etc for this theme
                        // in which case leave window.app.default_site_banner_settings as is
                    }
                }
                launch_overlay();
                return init.promise;
            }

            function launch_overlay () {

                window.aui.overlay_box.load({
                    title: 'Edit default homepage banner',
                    css_class: 'change-homepage-banner-overlay',
                    content: get_change_default_site_banner_html(),
                    box_width: '1200px',
                    show_close_button: true,
                    close_on_click_outside: false,
                    buttons: [
                        {
                            label: 'Cancel',
                            halign: 'right',
                            css_class: 'aui-btn-secondary cancel-homepage'
                        },
                        {
                            label: 'Save settings',
                            halign: 'left',
                            css_class: 'aui-button-extra-round save-settings',
                            callback: function () {
                                save_settings();
                            }
                        },
                        {
                            label: 'Save & Close',
                            halign: 'left',
                            css_class: 'aui-btn-secondary ml10',
                            callback: function () {
                                save_settings();
                                window.aui.overlay_box.close(null, $('.change-homepage-banner-overlay'));
                            }
                        },
                    ],
                    callback: function () {
                        // toggle relevant fields
                        if (window.app.default_site_banner_settings.image_uid) {
                            toggle_related_banner_img_fields(true);
                        } else {
                            toggle_related_banner_img_fields(false);
                        };
                        // init the image overlay field...
                        window.fieldhelpers.color.init();
                        // load saved settings
                        event_handlers();
                    },
                    on_close: function() {
                        $('.sp-container').remove();
                    },
                    on_load: function() {
                        if (!window.app.default_site_banner_settings.title_text_colour || !window.app.default_site_banner_settings.title_text_colour == '#1D2933' ) {
                            $('.default_site_banner_overlay .title').css('color', '#1D2933');
                        }
                        if (!window.app.default_site_banner_settings.date_text_colour || !window.app.default_site_banner_settings.date_text_colour == '#AAA' ) {
                            $('.default_site_banner_overlay .date').css('color', '#AAA');
                        }
                    }

                });
            }

            function event_handlers() {

                $('.change-homepage-banner-overlay').find('.aui-icon-cross, .cancel-homepage').off('click').on('click', function(e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if ($('.change-homepage-banner-overlay .save-settings').hasClass('aui-button-highlighted')) {
                        window.h.confirm({
                            title: 'You have unsaved changes',
                            msg: 'If you close this overlay without saving you will lose all unsaved changes',
                            ok_label: 'Save changes',
                            cancel_label: 'Close without saving',
                        }).then(function() {
                            save_settings();
                            window.aui.overlay_box.close(null, $('.change-homepage-banner-overlay'));
                        }, function() {
                            window.aui.overlay_box.close(null, $('.change-homepage-banner-overlay'));
                        });
                    } else {
                        window.aui.overlay_box.close(null, $('.change-homepage-banner-overlay'));
                    }
                });
                // banner image
                $('#change_homepage_banner_input').off('change').on('change', function () {
                    upload_file(this);
                });

                $('body').off('click', '.upload-button').on('click', '.upload-button', function() {
                    $('#change_homepage_banner_input').click();
                });

                $('body').on('click', '.homepage-banner-remove-image-btn', function(event) {
                    // remove hidden sorce for focalpoint selection...
                    $('.change-homepage-banner-overlay .user-banner-image').css('background-image', 'url()').css('background-position', '50.0% 50.0%');
                    $('.change-homepage-banner-overlay .image-url-placeholder').attr('src', '');
                    $('.change-homepage-banner-overlay .image-url-placeholder').attr('image_uid', '');
                    $('#homepage-overlay-customisations').remove();
                    $('[id^="override-change-homepage-banner-overlay"]').remove();
                    $('#homepage_banner_title_colour').parent().find('.sp-preview-inner').css('background-color', '#1D2933');
                    $('#homepage_banner_date_colour').parent().find('.sp-preview-inner').css('background-color', '#AAA');
                    $('#homepage_banner_overlay_colour').parent().find('.sp-preview-inner').css('background-color', 'rgba(0, 0, 0, 0)');
                    $('.banner-image-title').find('.title').css('color', '#1D2933');
                    $('.banner-image-title').find('.date').css('color', '#AAA');
                    toggle_related_banner_img_fields(false);
                    // set the banner image_uid and reset focal points
                    // window.app.homepage_banner_settings.image_uid = '';
                    // window.app.homepage_banner_settings.banner_focal_point_x = '';
                    // window.app.homepage_banner_settings.banner_focal_point_y = '';
                    // requires saving
                    $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                });


                var overlay_target = $('div.homepage_banner_overlay_colour .sp-preview-inner')[0]

                var overlay_observer = new MutationObserver(function(mutations) {

                  mutations.forEach(function(mutation) {
                    let overlay_style = mutation.target.attributes.style.nodeValue.replace(';', '').replace(' ', '').split(':');
                    let value = overlay_style[1]
                    override_pseudo_element('.change-homepage-banner-overlay .user-banner-image', {'background-color': value}, 'after');
                  });
                });

                overlay_observer.observe(overlay_target, {'attributes': true})

                // image overlay
                $('#homepage_banner_overlay_colour').off('change').on('change', function () {
                    // // window.app.homepage_banner_settings.image_overlay_colour = $('div.homepage_banner_overlay_colour .sp-preview-inner').css('background-color');
                    // override_pseudo_element('.change-homepage-banner-overlay .user-banner-image', {'background-color' : $('div.homepage_banner_overlay_colour .sp-preview-inner').css('background-color')}, 'after');
                    // // requires saving
                    $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                });

                var title_target = $('div.homepage_banner_title_colour .sp-preview-inner')[0]

                var title_observer = new MutationObserver(function(mutations) {

                  mutations.forEach(function(mutation) {
                    let title_style = mutation.target.attributes.style.nodeValue.replace(';', '').replace(' ', '').split(':');
                    let value = title_style[1];
                    $('.change-homepage-banner-overlay .title').css('color', value);
                  });
                });

                title_observer.observe(title_target, {'attributes': true})


                // text and date colour...
                $('#homepage_banner_title_colour').off('change').on('change', function () {
                    // // window.app.homepage_banner_settings.title_text_colour = $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color');
                    // $('.change-homepage-banner-overlay .title').css('color', $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color'));
                    // // requires saving
                    $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                });


                var date_target = $('div.homepage_banner_date_colour .sp-preview-inner')[0]

                var date_observer = new MutationObserver(function(mutations) {

                  mutations.forEach(function(mutation) {
                    let date_style = mutation.target.attributes.style.nodeValue.replace(';', '').replace(' ', '').split(':');
                    let value = date_style[1];
                    $('.change-homepage-banner-overlay .date').css('color', value);
                  });
                });

                date_observer.observe(date_target, {'attributes': true})


                $('#homepage_banner_date_colour').off('change').on('change', function () {
                    // // window.app.homepage_banner_settings.date_text_colour = $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color');
                    // $('.change-homepage-banner-overlay .date').css('color', $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color'));
                    // // requires saving
                    $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                });


                // image focalpoint
                $('body').off('click', '.homepage-banner-focalpoint-btn').on('click', '.homepage-banner-focalpoint-btn', function () {
                    $(this).stickyBox('<div id="focalpoint-container"></div><div class="fnote hidden">Move the circle to change which part of the image is displayed.</div>', {
                        //z_index: 99999,
                        padding: '10px',
                        width: 200,
                        on_load: function () {
                            // var settings = that.get_current_settings();
                            var initial_x = window.app.default_site_banner_settings.banner_focal_point_x ? window.app.default_site_banner_settings.banner_focal_point_x : 50.0;
                            var initial_y = window.app.default_site_banner_settings.banner_focal_point_y ? window.app.default_site_banner_settings.banner_focal_point_y : 50.0
                            $('#focalpoint-container').focalpoint({
                                image_url: $('.change-homepage-banner-overlay .image-url-placeholder').attr('src'),
                                initial_x: initial_x,
                                initial_y:  initial_y,
                                on_change: function (x, y) {
                                    // set focalpoint in UI
                                    $('.change-homepage-banner-overlay .user-banner-image').css('background-position', x + '% ' + y + '%');
                                    // update prefs...
                                    window.app.default_site_banner_settings.banner_focal_point_x = x;
                                   window.app.default_site_banner_settings.banner_focal_point_y = y;
                                    // requires saving
                                    if ((initial_x != x) || (initial_y != y)) {
                                        $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                                    }
                                }
                            });
                        }
                    });
                });
            }

            function get_change_default_site_banner_html() {
                // loads the change_homepage_banner template
                var focal_point_x = window.app.default_site_banner_settings.banner_focal_point_x,
                    focal_point_y = window.app.default_site_banner_settings.banner_focal_point_y,
                    image_uid = window.app.default_site_banner_settings.image_uid,
                    banner_image_url = image_uid ? window.h.image_urls.best(image_uid): '',
                    today = new Date(),
                    today_string = $.jcal.month_names[today.getMonth()] + " " + today.getDate().toString() + ", " + today.getFullYear().toString();

                return window.app.template.get('change_default_site_banner')({
                    site: window.aol_prefs.site,
                    site_name: window.aol_prefs.site_name,
                    date_today: today_string,
                    user_id: init.user_id,
                    overlay_colour: window.app.default_site_banner_settings.image_overlay_colour,
                    background_colour: window.app.default_site_banner_settings.banner_background_colour,
                    title_colour: window.app.default_site_banner_settings.title_text_colour,
                    date_colour: window.app.default_site_banner_settings.date_text_colour,
                    user_homepage_banner_image_url: banner_image_url,
                    user_homepage_banner_image_uid: image_uid,
                    focal_point_x: focal_point_x,
                    focal_point_y: focal_point_y,
                    has_focal_points: (focal_point_x && focal_point_y) ? true : false,
                });
            }

            function upload_file(file_element) {
                // upload banner image
                var form_data = new FormData,
                    file = file_element.files[0];
                form_data.append('import_file', file);
                form_data.append('user_id', init.user_id);
                $('.change-homepage-banner-overlay .upload-button').addClass('aui-button-loading').attr('disabled', true);

                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/change_homepage_banner',
                    dataType: 'json',
                    method: 'POST',
                    cache: false,
                    processData: false,
                    contentType: false,
                    data: form_data,
                    success: function (result) {
                        var image_uid = result['homepage_banner_uid'],
                            image_url = window.h.image_urls.best(image_uid);
                        // window.app.homepage_banner_settings.image_uid = image_uid;
                        // reflect in the UI
                        $('.change-homepage-banner-overlay .user-banner-image').css('background-image', 'url(\'' + image_url + '\')');
                        $('.change-homepage-banner-overlay .image-url-placeholder').attr('src', image_url);
                        $('.change-homepage-banner-overlay .image-url-placeholder').attr('image_uid', image_uid);
                        $('[id^="override-change-homepage-banner-overlay"]').remove();
                        $('.change-homepage-banner-overlay .upload-button').removeClass('aui-button-loading').attr('disabled', false);
                        toggle_related_banner_img_fields(true);
                        // requires saving
                        $('.change-homepage-banner-overlay .save-settings').addClass('aui-button-highlighted');
                    }
                });
            }

            function toggle_related_banner_img_fields(show) {
                // show or hide fields related to the banner image being set
                if (show) {
                    $('.banner-img-toggle-show').removeClass('hidden');
                    $('.banner-img-toggle-hide').addClass('hidden');
                } else {
                    $('.banner-img-toggle-show').addClass('hidden');
                    $('.banner-img-toggle-hide').removeClass('hidden');
                }
            }

            function update_default_site_banner_settings (user_id) {
                var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
                var user_homepage_exists = window.app.homepage_banner_settings.image_uid ? true : false;
                // var i = window.aol_prefs.users.map.length;
                // while (i--) {
                //     if (window.aol_prefs.users.map[i].id == user_id) {
                //         if (!_.isEmpty(window.aol_prefs.users.map[i].homepage_banner_details)) {
                //             if (window.aol_prefs.users.map[i].homepage_banner_details[current_theme].image_uid) {
                //                 user_homepage_exists = true;
                //             }
                //         }
                //     }
                // }

                if (!user_homepage_exists) {
                    // update the banner settings on the homepage
                    // of course... we may not be on that page!
                    var image_uid = window.app.default_site_banner_settings.image_uid ,
                        image_url = image_uid ? window.h.image_urls.best(image_uid) : '',
                        focal_point_y = window.app.default_site_banner_settings.banner_focal_point_y,
                        focal_point_x = window.app.default_site_banner_settings.banner_focal_point_x,
                        background_position = (focal_point_y && focal_point_x) ? focal_point_x + '% ' + (focal_point_y >= 5 ? focal_point_y - 5 : 0)  + '%'  : '50.0% 50.0%' // offset the y-axis by 5% to account space taken by the nav menu bar
                    if (image_url) {
                        $('.homepage-banner').css(
                                'background-image', 'url(\'' + image_url + '\')')
                            .css(
                                'background-position', background_position)
                            .css(
                                'height', '320px');

                        var title_colour = $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color')
                        var date_colour = $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color')

                        title_colour = title_colour == 'rgba(0, 0, 0, 0)' ? (current_theme == 'dark' ? '#FFF' : '#1D2933') : title_colour;
                        date_colour = date_colour == 'rgba(0, 0, 0, 0)' ? (current_theme == 'dark' ? '#DDD' : '#AAA') : date_colour;


                        $('.homepage-title span.title').css('color', title_colour);
                        $('.homepage-title span.date').css('color', date_colour);
                        override_pseudo_element('.homepage-banner', {'background-color' : $('div.homepage_banner_overlay_colour .sp-preview-inner').css('background-color')}, 'after');
                    } else {
                        // our standard / default image... url('../../../images/homepage/background.jpg');
                        $('.homepage-banner').css('background-image', '').css('background-position', '');
                        override_pseudo_element('.homepage-banner', {'background-color' : ''}, 'after');

                        $('.homepage-title span.title').css('color', (current_theme == 'dark' ? '#FFF' : '#1D2933'));
                        $('.homepage-title span.date').css('color', (current_theme == 'dark' ? '#DDD' : '#AAA'));

                        if (window.matchMedia("(max-height: 800px)").matches) {
                            $('.homepage-banner').css('height', '240px')
                        } else {
                            $('.homepage-banner').css('height', '320px');
                        }
                    };
                }
            }

            // function init_default_banner_settings () {
            //     var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
            //     window.app.default_site_banner_settings = window.aol_prefs.default_site_banner_settings[current_theme] ? window.aol_prefs.default_site_banner_settings[current_theme] : window.app.default_site_banner_settings;
            // }

            function check_user_banner_set () {
                var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
                var user_has_banner = false;
                var i = window.aol_prefs.users.map.length;
                while (i--) {
                    if (window.aol_prefs.users.map[i].id == init.user_id) {
                        if (!_.isEmpty(window.aol_prefs.users.map[i].homepage_banner_details)) {
                            if (window.aol_prefs.users.map[i].homepage_banner_details[current_theme].image_uid) {
                                user_has_banner = true;
                            }
                        }
                        return user_has_banner;
                    }
                }
            }

            function save_settings () {
                $('.save-settings').addClass('aui-button-loading').attr('disabled', true);
                var current_theme = $('html').hasClass('aui-theme-dark') ? 'dark' : 'light';
                var form_data = new FormData;
                //form_data.append('user_id', init.user_id);
                window.app.default_site_banner_settings.date_text_colour = $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color') == 'rgba(0, 0, 0, 0)' ? '#AAA' : $('div.homepage_banner_date_colour .sp-preview-inner').css('background-color');
                window.app.default_site_banner_settings.title_text_colour = $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color') == 'rgba(0, 0, 0, 0)' ? '#1D2933' : $('div.homepage_banner_title_colour .sp-preview-inner').css('background-color');;
                window.app.default_site_banner_settings.image_overlay_colour = $('div.homepage_banner_overlay_colour .sp-preview-inner').css('background-color');
                window.app.default_site_banner_settings.theme = parseInt($('#default_banner_theme').val()) ? 'all' : current_theme;


                if (!$('.change-homepage-banner-overlay .image-url-placeholder').attr('src')) {
                    window.app.default_site_banner_settings.image_uid = '';
                    window.app.default_site_banner_settings.banner_focal_point_x = '';
                    window.app.default_site_banner_settings.banner_focal_point_y = '';
                    window.app.default_site_banner_settings.image_overlay_colour = '';
                    window.app.default_site_banner_settings.title_text_colour = '#1D2933';
                    window.app.default_site_banner_settings.date_text_colour = '#AAA';
                } else {
                    window.app.default_site_banner_settings.image_uid = $('.change-homepage-banner-overlay .image-url-placeholder').attr('image_uid');
                }

                form_data.append('banner_settings', 1);
                form_data.append('image_overlay_colour', window.app.default_site_banner_settings.image_overlay_colour);
                form_data.append('title_text_colour', window.app.default_site_banner_settings.title_text_colour);
                form_data.append('date_text_colour', window.app.default_site_banner_settings.date_text_colour);
                form_data.append('banner_focal_point_y', window.app.default_site_banner_settings.banner_focal_point_y);
                form_data.append('banner_focal_point_x', window.app.default_site_banner_settings.banner_focal_point_x);
                form_data.append('image_uid', window.app.default_site_banner_settings.image_uid);
                form_data.append('theme', window.app.default_site_banner_settings.theme);
                form_data.append('is_site_banner', 1);
                window.app.request({
                    url: '/' + window.aol_prefs.site + '/api/data/users/change_homepage_banner',
                    dataType: 'json',
                    method: 'POST',
                    data: form_data,
                    cache: false,
                    processData: false,
                    contentType: false,
                    success: function (result) {
                        $('.save-settings').removeClass('aui-button-loading').removeClass('aui-button-highlighted').attr('disabled', false);
                        window.h.notify("Your settings were successfully saved");
                        update_default_site_banner_settings(init.user_id);
                        console.log(check_user_banner_set());
                        if (!window.app.default_site_banner_settings.image_uid && !window.app.homepage_banner_settings.image_uid) {
                            //no default banner and no user banner so remove all customisations
                            $('style#homepage-customisations').remove();
                            $('.homepage-title span.title').removeClass('override-applied');
                            $('.homepage-title span.date').removeClass('override-applied');
                            $('.homepage-banner').removeClass('override-applied');
                        }
                    }
                });
            }

            function override_pseudo_element (selector, styles, pseudo_el) {
                // example args:
                // - selector: ".myThing" or "#myThin"
                // - styles: {'color' : 'red', 'background-color' : 'blue'}
                // - pseudo_el: 'before' or 'after'
                // pseudo_element's such as :before and :after cannot be modified on-the-fly
                // instead we add a temporary stylesheet a recognisable id
                // this is only for on-the-fly manipulations...
                var override_id = 'override-' + selector.replaceAll('.', '').replaceAll('#', '').replace(' ', ''),
                    override_styles = '';
                // remove any existing
                $('style#' + override_id).remove();
                // $('style#homepage-customisations').remove();
                // add new style
                $.each(styles,function(k,v)
                    {
                        override_styles += (k + ':' + v + ';')
                    }
                );
                $('body').append('<style id="' + override_id + '">' + selector + '::' + pseudo_el + '{' + override_styles + '}</style>')
            }

            return init;
        })(),

        //////////////////////////////////////////////////
        // MEMBER EVENTS UI
        //////////////////////////////////////////////////

        member_events_init_section: function() {
            if ($('#membership_events_drawer').length > 0 || $('#membership_events_homepage_drawer').length > 0) {
                // which events are we participating in?
                var data = {
                    'member_events': {},
                    'upcoming_events_count': 0,
                    'upcoming_events_index': 0
                };

                if (window.conf && window.conf.view === 'shared_to_event') {
                    let event_id_in_view = window.conf.view_params[0];
                    if (!window.page_settings.member_event_settings[event_id_in_view]['is_archive']) {
                        // make sure the event isn't archived (won't need the drawer!)
                        data['member_events'][event_id_in_view] = window.page_settings.member_event_settings[event_id_in_view];
                        data['upcoming_events_count']++;
                    }
                } else {
                    // we're not in a 'shared_to_event' view
                    for (let event_id in window.page_settings.member_event_settings) {
                        // make sure none of the events we're looking at are archived
                        if (!window.page_settings.member_event_settings[event_id]['is_archive']) {
                            data['member_events'][event_id] = window.page_settings.member_event_settings[event_id];
                            data['upcoming_events_count']++;
                        }
                    }
                }

                window.app.template.member_event_drawer_events.done(function() {
                    var membership_events_homepage_drawer =  window.app.template.get('member-event-homepage-drawer');
                    if (data['upcoming_events_count']) {
                        var upcoming_event_ids = Object.keys(data['member_events']) || []
                        // we do have a not-archived upcoming event
                        if (upcoming_event_ids.length === 1) {
                            // just participating in one event
                            var membership_events_drawer = window.app.template.get('member-event-drawer-single-event'),
                                member_event_id = window.page_settings.member_event_settings[upcoming_event_ids]['member_event_id'];
                            window.app.member_event_init_drawer(member_event_id);
                        } else {
                            // to handle the annoying double 'hr' on last event
                            data['upcoming_events_index'] = data['upcoming_events_count'] - 1
                            var membership_events_drawer = window.app.template.get('member-event-drawer-multiple-events');
                        }

                        $('#membership_events_drawer').html(membership_events_drawer(data));
                        // $('.dashboard-alert').hide();
                        $('.dashboard-alert2').hide();
                    }
                    $('#membership_events_homepage_drawer').html(membership_events_homepage_drawer(data));
                });
            };
        },
        convert_event_date_value: function(event_date) {
          // a helper function to prettify the dates returned for the events
            let updated_date = new Date(event_date);
            return updated_date.toLocaleString('en-GB',{month: 'long', day: 'numeric', year: 'numeric' });
        },
        // mem_event_wizard: function(event_id) {
        //     // window.app.mem_event_wizard('fiac_spring_2021')

        //     window.app.request({
        //         url: "/" + aol_prefs.site + "/api/data/membership_events/get_event_details/",
        //         dataType: "json",
        //         method: "POST",
        //         data: {
        //             event_id: event_id
        //         }
        //     }).then(function (result) {
        //         if (result && result.event_data.label) {

        //             var event_data = result.event_data,
        //                 event_label = event_data.label ? event_data.label : '',
        //                 org_label = event_data.organisation_label ? event_data.organisation_label : '',
        //                 help_notes_url = event_data.help_notes_url ? event_data.help_notes_url : '',
        //                 content_deadline = event_data.content_deadline ? event_data.content_deadline : '',
        //                 event_dates = event_data.event_dates ? event_data.event_dates : {},
        //                 intro_html = `
        //                     <h3>You are participating in ` + event_label + `</h3><br>
        //                     Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nisi erat, ultricies non bibendum sit amet, fermentum a ligula.
        //                     Donec vel porttitor nunc, non finibus lectus. Praesent elementum, velit nec congue tempor, nibh urna accumsan massa,
        //                     vitae mattis felis ligula vitae magna. Nulla sodales dui at odio gravida, a sodales ex aliquam.
        //                 `,
        //                 step_1_html = `
        //                     Your gallery details will appear on your ` + event_label + ` page<br>
        //                     Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nisi erat, ultricies non bibendum sit amet, fermentum a ligula.
        //                     Donec vel porttitor nunc, non finibus lectus. Praesent elementum, velit nec congue tempor, nibh urna accumsan massa,
        //                     vitae mattis felis ligula vitae magna. Nulla sodales dui at odio gravida, a sodales ex aliquam.
        //                 ` + `<button class="aui-btn-primary" style="display:block;margin-top:15px;">Set up gallery details</button>`,
        //                 step_2_html = `
        //                     <div>
        //                         Your gallery details will appear on your ` + event_label + ` page<br>
        //                         Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nisi erat, ultricies non bibendum sit amet, fermentum a ligula.
        //                         Donec vel porttitor nunc, non finibus lectus. Praesent elementum, velit nec congue tempor, nibh urna accumsan massa,
        //                         vitae mattis felis ligula vitae magna. Nulla sodales dui at odio gravida, a sodales ex aliquam.
        //                     </div>
        //                 ` + `<button class="aui-btn-primary" style="display:block;margin-top:15px;">Create ` + event_label + ` presentation</button>`;

        //             window.aui.wizard.load({
        //                 transition_speed: 500,
        //                 show_close_button: true,
        //                 content: [
        //                     {
        //                         title: event_label + ' presentation setup guide',
        //                         content: intro_html,
        //                         box_width: '650px',
        //                     },
        //                     {
        //                         title: 'Step 1 of 2: Add your gallery details',
        //                         title_class: 'popup-header artsy_status_availability_setup',
        //                         content: step_1_html,
        //                         box_width: '650px'
        //                     },
        //                     {
        //                         title: 'Step 2 of 2: Create your ' + event_label + ' presentation',
        //                         content: step_2_html,
        //                         box_width: '650px',
        //                     },
        //                     {
        //                         title: event_label + ' setup is complete! ',
        //                         content: '<div>It is quick and easy to start sharing artworks with ' + event_label + ':<ol><li>\'New record\' Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>or<li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li></ol><br><div style="margin: 16px;border: 1px solid lightgrey;box-shadow: 0 4px 7px rgba(0, 0, 0, 0.15)"><img src="'+ window.h.static_url('/lib/docs/images/artsy_export_tool/exporting_multiple_artworks_artsy.gif') + '"><div></div>',
        //                         box_width: '650px',
        //                         //transition_speed: 0
        //                     }
        //                 ],
        //                 close_on_click_outside: false,
        //             });
        //         };
        //     });
        // },
        mem_event_get_pv_artworks: function(member_event_id) {
            window.app.api_request({
                endpoint: 'private_view_check_shared_w_event',
                method: 'POST',
                data: {
                    shared_to_member_organisation_website: member_event_id,
                }
            }).then(function (result) {
                if (result) {
                    var pv_selected_works = result["artwork_ids"],
                    url = window.aol_prefs.path_to_records + 'artworks/all/';
                    let artworks = pv_selected_works.join(',')
                    window.app.page.open({
                        url: url,
                        ui: 'window',
                        post_data: {
                            ids: artworks
                        }
                    });
                } else {
                    window.app.mem_event_artworks_unshared(member_event_id)
                }
            });
        },

        member_event_init_drawer: function(member_event_id) {
            // console.log("Uncomment below to integrate")
            // console.log("requesting...");
            window.app.request({
                url: "/" + aol_prefs.site + "/api/data/membership_events/get_event_details/",
                dataType: "json",
                method: "POST",
                data: {
                    event_id: member_event_id
                }
            }).then(function (result) {
                // console.log(result)
                // update the icons...
                window.app.member_event_update_drawer_icons('artworks', result['event_data']['artworks']);
                window.app.member_event_update_drawer_icons('gallery_details', result['event_data']['gallery_details']);
                window.app.member_event_update_drawer_icons('pv', result['event_data']['pv']);
            });

        },
        member_event_update_drawer_icons: function(required_step, data) {
            var section_completeness = 'complete',
                total_artworks = 0;
            // console.log("Looking at... ", required_step)
            if (required_step === 'artworks') {
                total_artworks = data['count'][0];
                if (total_artworks == 0) {
                    section_completeness = 'incomplete';
                } else {
                    for (let item in data) {
                        if (data[item] !== 'count') {
                            if (data[item][0] !== total_artworks && data[item][1] === 'required') {
                                section_completeness = 'incomplete';
                            } else if (data[item][0] !== total_artworks && data[item][1] === 'optional' && section_completeness !== 'incomplete') {
                                // don't overwrite if a required field is missing
                                section_completeness = 'maybe-complete';
                            }
                        }
                    }
                }
            } else {
                for (let item in data) {
                    // console.log(item, data[item])
                    if (!data[item][0] && data[item][1] === 'required') {
                        section_completeness = 'incomplete';
                        // console.log(section_completeness)
                    } else if (!data[item][0] && data[item][1] === 'optional' && section_completeness !== 'incomplete') {
                        // don't overwrite if a required field is missing
                        section_completeness = 'maybe-complete';
                        // console.log(section_completeness)
                    }
                }
            }
            // Update the icons...
            $('.dashboard-alert__icon-list .fa').removeClass('pending');
            if (required_step === 'gallery_details') {
                $('.fa-edit').addClass(section_completeness);
                } else if (required_step === 'artworks') {
                    $('.fa-th').addClass(section_completeness);
                } else {
                    $('.fa-tablet').addClass(section_completeness);
                }
        },
        mem_event_dashboard_count_incomplete: function() {
            $('.aui-alert-section').each(function() {
                var success_count = $(this).find('.aui-text-success').length,
                    find_missing_required = $(this).find('.aui-text-danger').length,
                    find_missing_optional = $(this).find('.aui-text-warning').length;

                var total_count = find_missing_optional + find_missing_required + success_count

                $(this).parent().parent().find('.member-event-success-count').text(success_count);
                $(this).parent().parent().find('.member-event-total-count').text(total_count);

                if (!find_missing_required && !find_missing_optional) {
                    $(this).parent().parent().find('.aui-bubble').addClass("aui-success");
                } else if (!find_missing_required && find_missing_optional) {
                    $(this).parent().parent().find('.aui-bubble').addClass("aui-warning");
                    $(this).parent().parent().addClass('aui-active');
                } else {
                    $(this).parent().parent().find('.aui-bubble').addClass("aui-danger");
                    $(this).parent().parent().addClass('aui-active');
                }
            });
        },

         mem_event_dashboard_open_incomplete_accordions: function(accordian_id) {
            if (accordian_id) {
                // just open one specific accordian e.g. 'artworks'
                $('#event-dashboard-overlay .browse-accordion-header').each(function() {
                    var acc_id = $($(this).parent()).data('accordion');
                    if (acc_id.endsWith(accordian_id)) {
                        $(this).parent().removeClass("aui-active");
                        window.aui.accordion.open(acc_id);
                    }
                });
            } else {
                // open all incompleted accordians
                $('#event-dashboard-overlay .browse-accordion-header').each(function() {
                    if ($(this).parent().hasClass("aui-active")) {
                        var acc_id = $($(this).parent()).data('accordion');
                        $(this).parent().removeClass("aui-active")
                        window.aui.accordion.open(acc_id);
                    }
                });
            }
        },


        mem_event_dashboard: function(overlay, event_id, width=null, accordian=null) {
            var participating_event_details = {};
            // var hb_template = window.app.template.load('/member_event_dashboard')
            //     content = hb_template();
            //     $('#member-event-dashboard').html()
            // var content = window.aui.compiled_templates["member-event-dashboard"]()
            var event_id = event_id;
            // console.log("requesting ", event_id, "...")
            //window.app.ui.loading_box({title: 'Fetching details...', box_width:'210px'});
            window.app.request({
                url: "/" + aol_prefs.site + "/api/data/membership_events/get_event_details/",
                dataType: "json",
                method: "POST",
                data: {
                    event_id: event_id
                }
            }).then(function (result) {
                // window.app.ui.popup.close()
                if (result && result['success']) {
                    var content = window.app.template.get('member-event-dashboard-overlay');
                    // use the results from result
                    participating_event_details = result['event_data'];
                    var org_label = participating_event_details['organisation_label'],
                        event_label = participating_event_details['event_label'] ? participating_event_details['event_label'] : participating_event_details['label'],
                        org_event_label = org_label + ' ' + participating_event_details['label'],
                        pv_id = participating_event_details['pv_id'];
                    // console.log(participating_event_details)
                    var html = content({
                        'event_id': participating_event_details['member_event_id'],
                        'organisation_label': org_label,
                        'organisation_label_short': participating_event_details['label_short_name'] ? participating_event_details['label_short_name'] :  participating_event_details['organisation_label'],
                        'event_label': event_label,
                        'opening_date': participating_event_details['event_dates'] && participating_event_details['event_dates']['start'] ? window.app.convert_event_date_value(participating_event_details['event_dates']['start']) : '',
                        'max_artworks': participating_event_details['max_artworks'],
                        'intro_html': participating_event_details['dashboard_settings'] && participating_event_details['dashboard_settings']['intro_template'] ? participating_event_details['dashboard_settings']['intro_template'].replaceAll('[site]', window.aol_prefs.site) : '',
                        'shared_artworks': participating_event_details['artworks']['count'] || 0,
                        'gallery_phone': participating_event_details['gallery_details']['gallery_phone_number'],
                        'representative_image': participating_event_details['gallery_details']['gallery_thumbnail_img_uid'], // is this the right value?
                        'gallery_website': participating_event_details['gallery_details']['gallery_website_url'],
                        'gallery_email': participating_event_details['gallery_details']['enquiry_email'],
                        'gallery_address': participating_event_details['gallery_details']['gallery_address'],
                        'privacy_policy' : participating_event_details['gallery_details']['privacy_policy'],
                        'gallery_description' : participating_event_details['gallery_details']['gallery_description'],
                        'enquiry_email' : participating_event_details['gallery_details']['enquiry_email'],
                        'sales_teams' : participating_event_details['gallery_details']['sales_teams'],
                        'gallery_twitter_url' : participating_event_details['gallery_details']['gallery_twitter_url'],
                        'gallery_instagram_url' : participating_event_details['gallery_details']['gallery_instagram_url'],
                        'gallery_facebook_url' : participating_event_details['gallery_details']['gallery_facebook_url'],
                        'banner_image': participating_event_details['pv']['banner_image'],
                        'video_content': participating_event_details['pv']['video_url'],
                        'text_above': participating_event_details['pv']['text_above'],
                        'dimensions': participating_event_details['artworks']['dimensions'],
                        'view_on_wall': participating_event_details['artworks']['view_on_a_wall'],
                        'artwork_description': participating_event_details['artworks']['description'],
                        'artwork_price': participating_event_details['artworks']['currency'], // *** LISTED AS PRICE ? - returns e.g. 'currency': [0, 'EUR']
                        'artwork_secondary_images' : participating_event_details['artworks']['secondary_images'],
                        'artwork_event_filters_medium' : participating_event_details['artworks']['event_filters_medium'],
                        'pv_id': pv_id,
                        'pv_selected_works': participating_event_details['pv_selected_works'],
                        'pv_terminology': participating_event_details['pv_terminology'] || 'Exhibitor Page'
                    });
                    if (overlay) {
                        if ((accordian == 'artworks' ||accordian == 'pv') && !pv_id) {
                            window.app.mem_event_artworks_unshared(event_id);
                        } else {
                            window.aui.overlay_box.load({
                                title: event_label,
                                content: html,
                                id: `${participating_event_details['organisation_id']}_dashboard`, // member_event_id ?
                                box_width: '800px',
                                buttons: [
                                    {
                                        label: 'Cancel',
                                        halign: 'left',
                                        css_class: 'aui-button-simple',
                                    },
                                    {
                                        label: 'Support guide',
                                        halign: 'right',
                                        css_class: 'aui-button-simple',
                                        callback: function () {
                                            window.aui.overlay_box.close().then(function () {
                                                window.open(participating_event_details['help_notes_url'], '_blank');
                                        });
                                }
                                    }
                                ],
                                close_on_click_outside: true,
                                on_load: function () {
                                    window.app.mem_event_dashboard_count_incomplete();
                                    window.app.mem_event_dashboard_open_incomplete_accordions(accordian);
                                },
                            });
                        }
                    } else {
                        window.aui.pane.load({
                            //node: node,
                            title: '',
                            content: `<h2>${participating_event_details['label']} dashboard</h2>` + html,
                            squeeze_content: false,
                            box_width: width ? width : 500,//self.settings.preview_pane_width,
                            on_load: window.app.mem_event_dashboard_open_incomplete_accordions, // also need  window.app.mem_event_dashboard_count_incomplete();...
                            //buttons: [{label: 'Close', halign: 'left', cancel: true, callback: function () {console.log('btn click')}}]
                        });
                    }
                }
            })
        },

        mem_event_artworks_unshared: function(member_event_id) {
            // window.app.mem_event_artworks_unshared('fiac_spring_2021');
            var event_label = window.page_settings.member_event_settings[member_event_id]['label'] ? window.page_settings.member_event_settings[member_event_id]['label'] : 'this event',
                organisation_label = window.page_settings.member_event_settings[member_event_id]['organisation_label'] ? window.page_settings.member_event_settings[member_event_id]['organisation_label'] : '',
                help_notes_url = window.page_settings.member_event_settings[member_event_id]['help_notes_url'] ? window.page_settings.member_event_settings[member_event_id]['help_notes_url'] : '';
            var help_notes_available = help_notes_url ? " <a href='" + help_notes_url + "' target='_blank'>follow our help notes</a> for a step-by-step guide to" : "",
                artworks_url = window.aol_prefs.path_to_records + 'artworks/main/';
            var content = `<br />To get started,${help_notes_available} upload, flag, and share artworks with ${organisation_label} ${event_label} or head to the <a href="${artworks_url}">Artworks section</a> to begin sharing.`;

            window.aui.overlay_box.load({
                title: `You have not shared any artworks to ${organisation_label} ${event_label}`,
                content: content,
                box_width: 500,
                buttons: [
                    {
                        label: "Close",
                        css_class: "aui-button-simple",
                        halign: "left"
                    },
                    {
                        label: "Upload & Share",
                        halign: "right",
                        callback: function() {
                            window.app.page.open({
                                url: window.aol_prefs.path_to_records + 'artworks/main/',
                                ui: 'replace'
                            });
                        }
                    }
                ]
            });

        },

        //////////////////////////////////////////////////
        // DELETE RECORD
        //////////////////////////////////////////////////

        delete_record: function (tablename, rec_id, skip_confirm, json_data) {
            var that = this;

            var promise = $.Deferred();

            var permit_delete = $.Deferred();

            if (window[tablename] && window[tablename].permit_delete) {
                 window[tablename].permit_delete(rec_id, permit_delete);
            } else {
                permit_delete.resolve();
            }

            var on_before_delete = $.Deferred();
            var before_delete = $.Deferred();

            permit_delete.fail(function() {
                promise.reject();
                return promise;
            });

            permit_delete.then(function() {
                if (window[tablename] && window[tablename].on_before_delete) {
                    // Include an additional function BEFORE confirm delete is displayed
                    // e.g. a warning, information, etc.
                    return window[tablename].on_before_delete();
                }
            }).then(function() {
                if (skip_confirm) {
                    return true;
                } else {
                    return window.h.confirm({
                        title: 'Delete record?',
                        msg: 'Are you sure you want to delete the entire record? This cannot be undone.',
                        ok_label: 'Delete'
                    });
                }
            }).then(function () {
                if (window[tablename] && window[tablename].before_delete) {
                    window[tablename].before_delete(rec_id).then(function () {
                        before_delete.resolve();
                    });
                } else {
                    before_delete.resolve();
                }
            });

            before_delete.then(function() {
                that.request_record_delete(tablename, rec_id, json_data).done(function(result) {

                    if (window[tablename] && window[tablename].after_delete) {
                        window[tablename].after_delete(rec_id);
                    }

                    promise.resolve(result);
                }).fail(function() {
                    window.h.alert('' +
                        'There has been a problem deleting the record. ' +
                        'If the problem persists please contact support@artlogic.net'
                    );
                    promise.reject();
                });
            });

            return promise;
        },

        request_record_delete: function (tablename, rec_id, json_data) {
            var data = json_data || {};
            Object.assign(data, {
                '_conf_name': tablename,
                '_rec_id': rec_id
            });
            return window.app.request({
                url: window.app.api_urls.delete_record,
                data: data
            });
        },


        __testing_show_message_invoices: function() {
            window.app.ui.popup.load({
                title: "Invoices",
                title_class: "popup-header-big",
                content: this.template.get("beta_message_invoices")(),
                box_width: "750px"
            });
        },

        add_csrf_input_element: function(form) {
            var csrf_token = document.createElement("input");
            csrf_token.name="csrf_token";
            csrf_token.type="hidden";
            csrf_token.value=$('meta[name="csrf_token"]').attr('content');
            form.appendChild(csrf_token);
        },

        show_rejected_emails: function(log_id) {

            window.app.templates.rejected_emails.done(function(){

                window.app.request({
                    url: window.app.api_urls.get_rejected_emails,
                    method: 'POST',
                    dataType: 'json',
                    data: {
                        log_id: log_id,
                        include_restored: 1
                    }
                }).then(function(response) {

                    if (response && response.success) {

                        var template_data = {
                                rows: response.rows,
                                site: window.aol_prefs.site,
                                log_has_errors: response.log_has_errors,
                                log_has_empties: response.log_has_empties,
                                backup_time: response.backup_time,
                                restored_date: response.restored_date
                            },
                            source = response.restored_date ? $("#restored-emails-template").html() : $("#rejected-emails-template").html(),
                            template = Handlebars.compile(source),
                            content = template(template_data);

                        if (window.conf && window.conf.name == 'modification_history') {

                            window.app.ui.popup.load({
                                content: content,
                                box_width: response.restored_date ? "450px" : "600px",
                            });

                        } else {

                            $('#rejected-emails-list').html(content);

                            if (response.restored_date) {
                                $('#restore-rejected-emails').prop('disabled', true);
                            }

                        }

                    } else {

                        window.h.alert('Sorry - something went wrong', 'We encountered a problem retrieving the list of rejected emails. The contact records may have been deleted.<br><br>If you believe this is not the case and the problem persists, please contact <a href="mailto:support@artlogic.net">support@artlogic.net</a>')

                    }

                });


            });

        },

        global_search_sns: {
            init: function (id) {
                /* global search is the search on the navbar and home screen that can search either contacts or artworks.
                Supply this function with a container el and it'll find the sns within it and initiate it. The id corresponds
                to the id arg sent to the mako template. */
                this.event_handlers(id);
            },
            event_handlers: function (id) {
                const that = this;

                $("body").on("change", "input[name='" + id + "_select_lookup']", function() {
                    /* change whether we're searching artworks or contacts */
                    sns.instances["f_" + id].table = $(this).val();
                    if (sns.instances["f_" + id].table === "contacts") {
                        sns.instances["f_" + id].images = false;
                    }
                    else if (sns.instances["f_" + id].table === "artworks") {
                        sns.instances["f_" + id].images = true;
                    }
                    $("div.sns-search-results[data-instance_id='f_" + id + "']").width(
                        $("input.sns-search-field[data-instance_id='f_" + id + "']").outerWidth() - 2
                    );
                    $("input[data-instance_id='f_" + id + "'].sns-search-field").trigger("keyup");
                });

                $("input[data-instance_id='f_" + id + "'].sns-search-field").on("keyup", function(event) {
                    $("div.sns-search-results[data-instance_id='f_" + id + "']").width(
                        $("input.sns-search-field[data-instance_id='f_" + id + "']").outerWidth() - 2
                    );
                });

                $("body").on("sns_enter_pressed", "input[data-instance_id='f_" + id + "'].sns-search-field", function() {
                    window.open("/" + aol_prefs.site + "/records/" + sns.instances['f_' + id].table + "/?quicksearch=" + $(this).val(), "_self");
                });

                $("body").on("sns_item_clicked", function(event, data, instance_id) {
                    if (instance_id === "f_" + id) {
                        window.open("/" + aol_prefs.site + "/records/" + sns.instances["f_" + id].table + "/all/?ids=" + data.id + "#select-" + data.id, "_self");
                    }
                });

                $("body").on("sns_initialised.unset_height", function(_arg1, id) {
                    // only do this for global search otherwise it breaks other sns instances
                    if (id === 'f_main_toolbar_global_search_sns') {
                        that.unset_sns_container_height(id);
                    }
                })
            },
            unset_sns_container_height: function (id) {
                // sns-2.0.js annoyingly hardcodes a height of 23 pixels via the javascript,
                // so we undo that here
                $('#' + id + '_sns_container').removeAttr('style');
            }
        },

        artlogicpay: {
            /** unified_account_id is typically blank but can be passed in from developer only fields */
            create_unified_stripe_account: function(unified_account_id) {
                return app.api_request({
                    endpoint: 'create_unified_stripe_account',
                    data: {
                        account_id: unified_account_id,
                        email: page_settings.user.email,
                        country: page_settings.default_country
                    },
                    on_error: function(jqXHR, textStatus, errorThrown) {
                        var error_email_subject =  'Error whilst trying to call Create Unified Stripe account API'
                        var error_description = 'An error occured whilst trying to create a Stripe account via create unified stripe account api.'
                        window.artlogic_pay_onboarding.win.artlogic_pay_onboarding.send_error_report(error_email_subject, error_description, jqXHR);
                    },
                });
            },

            connect_unified_stripe_account: function(unified_account_id) {
                return app.api_request({
                    endpoint: 'connect_unified_stripe_account',
                    data: {
                        account_id: unified_account_id
                    },
                    on_error: function(jqXHR, textStatus, errorThrown) {
                        var error_email_subject =  'Error whilst trying to call Connect Unified Stripe account API'
                        var error_description = 'An error occured whilst trying to connect a Stripe account via connect unified stripe account api.'
                        window.artlogic_pay_onboarding.win.artlogic_pay_onboarding.send_error_report(error_email_subject, error_description, jqXHR);
                    },
                });
            },

            in_maintenance_mode: function() {
                return app.api_request({
                    endpoint: 'artlogic_pay_maintenance_mode',
                });
            },
        },

    };

    /* -------------------------------------------------------------------------
    * Hector - Oct 2017
    * This function is intended to work as a replacement for the jQuery .val()
    * function, which hiccoughs on our weird fields.
    *
    * So far it works on
    *      - Radio boxes
    *      - Checkboxes
    *      - Bool large
    *      - Text fields
    *      - Rich text area
    *      - Select boxes
    *      - Dates (jCal style)
    *      - Colour picker field (from offers)
    *
    * And possibly more
    * ------------------------------------------------------------------------*/
    $.fn._val = function(value) {
        var field = this;

        if (!field.length) {
            return undefined
        }

        var name = field[0].name;
        var type = field[0].type;

        // // Rich Text
        // if (field.prop('contenteditable')) {
        //     console.log('contenteditable');
        //     if (value) {
        //         field.html(value);
        //         return $(this);
        //     } else {
        //         return field.html();
        //     }
        // }

        // Radio-box
        if (type === 'radio') {
            if (value) {
                $("#f_" + name + "-" + value)[0].checked = true;
                return $(this);
            } else {
                return $("[name='" + name + "']:checked").val();
            }
        }

        // Checkbox
        if (field.hasClass("for_checkbox")) {
            if (value || value === 0) {
                // We have to set the checkbox to checked, but there is also a
                // hidden input underneath, whose value we must also set.
                if (value === '0' || value === 0) {
                    $("#chk_" + name)[0].checked = false;
                    this.val(0);
                    return $(this);
                } else if (value === '1' || value === 1) {
                    $("#chk_" + name)[0].checked = true;
                    this.val(1);
                    return $(this);
                }
            } else {
                if ($("#chk_" + name)[0].checked) {
                    return '1'
                } else {
                    return '0'
                }
            }
        }

        // Bool large
        if (field.hasClass("for_bool-large")) {
            var current_value = field.val();

            if (typeof value === 'undefined') {
                return current_value;
            }

            if (current_value !== value) {
                var parent = field.parent();
                var switch_btn = parent.find('.onoff-switch-btn');

                switch_btn.click();
            }
            return;
        }

        // Text Area
        if (type === 'textarea') {
            if (value) {
                // Like the checkbox, there are two things we must set.
                // The html and the value.
                $('[data-fieldname="' + name + '"]').html(value);
                this.val(value);
                return $(this);
            } else {
                return $('[data-fieldname="' + name + '"]').html();
            }
        }

        // jCal fields
        if (field.hasClass('jcal_value_field')) {
            var jcal_field = field.parent().find('.jcal');
            if (jcal_field.length) {
                if (value) {
                    var r = field.val(value);
                    if (jcal_field.hasClass('jcal-inited')) {
                        jcal_field.jcal('reload');
                    } else {
                        window.fieldhelpers.jcal.init();
                    }
                    return r;
                } else {
                    return field.val();
                }
            }
        }

        // colour picker
        if (field.hasClass('for_colour-picker')) {
            if (value) {
                window.fieldhelpers.colour_picker.set_colour(field, value);
            } else {
                return field.val();
            }
        }

        // Everything else
        if (value) {
            return field.val(value);
        } else {
            return field.val();
        }
    }

    $(document).ready(function() {
        if (FastClick) {
            FastClick.attach(document.body);
        }
        window.app.init();
    });

})(jQuery);

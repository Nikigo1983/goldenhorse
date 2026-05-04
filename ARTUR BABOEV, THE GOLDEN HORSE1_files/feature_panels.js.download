(function ($) {

    window.feature_panels = {

        init: function () {
            window.feature_panels.layout.init();
            window.feature_panels.twitter.init();
        },

        layout: {

            init: function () {
                if ($('.feature_panels').length) {
                    $('.feature_panels').each(function () {
                        if ($('.panel:eq(0)', this).hasClass('panel_hero')) {
                            $(this).addClass('first_panel_full_bleed');
                        }
                    });
                }

                if ($('.panel_image_text_columns').length) {
                    $('.panel_image_text_columns .read_less_link').hide();
                    $('.panel_image_text_columns .read_more_link a').click(function () {
                        $(this).closest('.panel_image_text_columns').addClass('read-more-text-open');
                        $(this).closest('.link, .read_more_link').slideUp();
                        $(this).closest('.content').find('.content_full').slideDown();
                        $(this).closest('.content').find('.initial_content').slideUp();
                        $(this).closest('.content').find('.read_less_link').slideDown();
                        setTimeout(function () {
                            // resize window after collapsing text panel 
                            // to ensure parallax images get repositioned 
                            $(window).trigger('resize');
                        }, 300);
                        return false;
                    });
                    $('.panel_image_text_columns .read_less_link a').click(function () {
                        $(this).closest('.panel_image_text_columns').removeClass('read-more-text-open');
                        $(this).closest('.link:not(.read_less_link), .read_more_link').slideDown();
                        $(this).closest('.content').find('.content_full').slideUp();
                        $(this).closest('.content').find('.initial_content').slideDown();
                        $(this).closest('.content').find('.read_less_link').slideUp();
                        $('html,body').animate(
                            {scrollTop: $(this).closest('.content').find('.initial_content').offset().top - 100},
                            400,
                            'easeInOutQuad'
                        );
                        return false;
                    });
                }

                if ($('.feature_panels ul li .panel_image_slideshow').length) {
                    $('.feature_panels ul li .panel_image_slideshow').each(function () {

                        if ($('.panel_slide[data-caption]', this).filter('[data-caption!=""]').length) {

                            if ($(this).hasClass("text_image_full_width_slideshow")) {

                                var related_caption_element = $(this).closest('li').find('.enquire_button_container').find('a.website_contact_form');
                                $(related_caption_element).attr('data-contact-form-details', $('.panel_slide', this).eq(0).attr('data-caption'));
                                $(related_caption_element).attr('data-contact-form-image', $('.panel_slide', this).eq(0).attr('data-image'));
                                $(related_caption_element).parent().parent().parent().parent().find(".image-caption").html($('.panel_slide', this).eq(0).attr('data-caption'));

                            } else {
                                var related_caption_element = $(this).closest('li').find('.slider-content');
                                $(related_caption_element).attr('data-default-caption', $(related_caption_element).html());
                                $(related_caption_element).html('');
                                var first_slide_caption = $('.panel_slide', this).eq(0).attr('data-caption');
                                if (first_slide_caption) {
                                    $(related_caption_element).html(first_slide_caption);
                                } else {
                                    $(related_caption_element).html($(related_caption_element).attr('data-default-caption'));
                                }
                            }


                        } else {
                            $(this).addClass('panel_image_slideshow_captions_disabled')
                        }

                        var mastersettings = {
                            fx: 'fade',
                            speed: 800,
                            timeout: 2500,
                            pause: 0,
                            slides: '>',
                            autoHeight: 'calc',
                            swipe: true
                        }

                        if (typeof $.fn.cycle == 'undefined') {
                            var that = this;
                            $.getScript('/lib/jquery/1.12.4/plugins/jquery.cycle2.min.js', function () {
                                $(that).cycle(mastersettings);
                            })
                        } else {
                            $(this).cycle(mastersettings);
                        }

                        var slideshow_controls = $(this).next();

                        if (slideshow_controls.length) {
                            var previous = $(slideshow_controls).find('.slideshow_controls_previous');
                            var next = $(slideshow_controls).find('.slideshow_controls_next');
                            var progress = $(slideshow_controls).find('.slideshow_controls_progress');

                            // Setup button functions
                            previous.click(() => {
                                $(this).cycle('prev')
                            });
                            next.click(() => {
                                $(this).cycle('next')
                            });

                            // Add event handlers
                            $(this).on('cycle-update-view', (_event, optionHash) => {
                                progress.html(`${optionHash.currSlide + 1}/${optionHash.slideCount}`);
                            });
                        }

                        var onfunction = $(this).on;
                        if (onfunction) {
                            // Method for jQuery Cycle 2 ONLY
                            // 
                            // Function fired directly before the slide changes
                            $(this).on('cycle-before', function (event, optionHash, outgoingSlideEl, incomingSlideEl, forwardFlag) {
                                var this_instance = $(this).closest('.panel_image_slideshow');
                                if (!$(this_instance).hasClass('panel_image_slideshow_captions_disabled')) {
                                    var current_caption = $(incomingSlideEl, this_instance).attr('data-caption');
                                    //console.log("next slide number = "+ optionHash.nextSlide);
                                    $(".fp-slider-share > ul > li").hide();
                                    $(".fp-slider-share > ul > li:nth-child("+(optionHash.nextSlide + 1)+")").show();
                                    //console.log(".fp-slider-share > ul > li:nth-child("+(optionHash.nextSlide + 1)+")");

                                    if (current_caption) {
                                        if ($(this).hasClass("text_image_full_width_slideshow")) {
                                            $(related_caption_element).parent().parent().parent().parent().find(".image-caption").html(current_caption);
                                            $(related_caption_element).attr('data-contact-form-details', current_caption.replace(/\n/g, ''));

                                            $(related_caption_element).attr('data-contact-form-image', $(incomingSlideEl, this_instance).attr('data-image'));
                                        }else{
                                            $(related_caption_element).html(current_caption.replace(/\n/g, ''));
                                        }
                                    } else {
                                        if ($(this).hasClass("text_image_full_width_slideshow")) {
                                            $(related_caption_element).attr('data-contact-form-details', "");
                                            $(related_caption_element).attr('data-contact-form-image', "");

                                            $(related_caption_element).parent().parent().parent().parent().find(".image-caption").html("");
                                        }else{

                                            $(related_caption_element).html($(related_caption_element).attr('data-default-caption'));
                                        }
                                    }
                                    window.galleries.contact_form_popup.init();
                                }
                            });
                        }
                    });
                }
            }

        },

        twitter: {

            init: function () {
            }

        }

    };


    $(document).ready(function () {

        window.feature_panels.init();

    });

})(jQuery);



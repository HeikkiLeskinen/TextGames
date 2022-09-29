// Created with Squiffy 5.0.0
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
            var incDecRegex = /^([\w]*)\s*([\+\-])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
                rhs = parseFloat(incDecMatch[3]);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);

            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = '_default';
squiffy.story.id = '99a27c5b1e';
squiffy.story.sections = {
	'_default': {
		'text': "<p>En vanlig stinkande skoldag.</p>\n<p>Shawn vaknar upp som en naken-fis i badrummet. PÅ golvet ligger hans mobil telefon och hans kalsonger.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"1.kalsonger\" role=\"link\" tabindex=\"0\">Ta på sig kalsongerna</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"1.mobil\" role=\"link\" tabindex=\"0\">Ta upp mobilen med roblox spelet i </a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"1.pappa\" role=\"link\" tabindex=\"0\">Spelar bebis och be pappa sätta på hans kalsonger åt honom</a>.<br></p>",
		'passages': {
		},
	},
	'1.kalsonger': {
		'text': "<p>Bra, det var dem sista rena kalsongerna. Nu måste lillebror ha tjejkalsonger. \n<a class=\"squiffy-link link-section\" data-section=\"1.mobil\" role=\"link\" tabindex=\"0\">Ta upp mobilen med roblox spelet i </a>.<br></p>",
		'passages': {
		},
	},
	'1.pappa': {
		'text': "<p>Ryan vill hjälpa stora fejk bebisen, Shawn. Han stoppar en bebis napp i shawns mun.\n<a class=\"squiffy-link link-section\" data-section=\"1.mobil\" role=\"link\" tabindex=\"0\">Ta upp mobilen med roblox spelet i </a>.<br></p>",
		'passages': {
		},
	},
	'1.mobil': {
		'text': "<p>Åh, nej. Telefonen är slut på batteri. Pappa glömde ladda telefonen dagen innan. </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"2.charger\" role=\"link\" tabindex=\"0\">Gå ner och ladda telefonen i laddningstationen </a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"3.breakfast\" role=\"link\" tabindex=\"0\">Gå ner och äta frukost</a>.<br></p>",
		'passages': {
		},
	},
	'2.charger': {
		'text': "<p>Pappa laddar sin telefon i laddningstationen, och när Shawnie stjäler pappas sladd, upptäcker pappa detta. Pappa tvingar Shawn att äta frukost och beslagtar shawnie&#39;s telefon. </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"3.breakfast\" role=\"link\" tabindex=\"0\">Gå till köket och ät frukost</a>.<br></p>",
		'passages': {
		},
	},
	'3.breakfast': {
		'text': "<p>På bordet serveras:</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"3.mat\" role=\"link\" tabindex=\"0\">Leverpastej med saltgurka</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"3.mat\" role=\"link\" tabindex=\"0\">Mördarsnigel med kyckling nuggets</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"3.mat\" role=\"link\" tabindex=\"0\">Spindelägg med ostsås</a>.<br></p>",
		'passages': {
		},
	},
	'3.mat': {
		'text': "<p>YAM! YAM! Shawn älskar maten!<br>\n<b>Nu är det dags att gå till skolan</b> Pappa skricker som en stucken gris <b>Alla barnen till skostationen!</b>\nOch Shawn, <b>Glöm inte din skolväska.</b></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"4.shoestation\" role=\"link\" tabindex=\"0\">Gå till skostationen</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"4.forgetback\" role=\"link\" tabindex=\"0\">Hämta pappas stinkande strumpor och gå till skostationen</a>.<br></p>",
		'passages': {
		},
	},
	'4.forgetback': {
		'text': "<p>Min snygge stora kille, glöm inte skolväskan ropar mamma från köket.Titta mamma, jag ska skoja med pappa, säger shawn och sätter pappas strumpa som en vante över handen</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"4.shoestation\" role=\"link\" tabindex=\"0\">Gå till skostationen</a>.<br></p>",
		'passages': {
		},
	},
	'4.shoestation': {
		'text': "<p>Ryan vill inte sitta bredvid shawn stinkande strumpa. \nDet regnar idag. what should you wear to school?</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"5.ninja_pyjamas\" role=\"link\" tabindex=\"0\">Ninja pyjamas</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"5.ninja_pyjamas_och_paraply\" role=\"link\" tabindex=\"0\">Ninja pyjamas och ett paraply</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"5.kastrul\" role=\"link\" tabindex=\"0\">Kastrull över huvudet</a>.<br></p>",
		'passages': {
		},
	},
	'5.ninja_pyjamas': {
		'text': "<p>Jättesnygg pyjamas, men shawn och ryan blir helt blöta inom 3 minuter. </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"6.bilen\" role=\"link\" tabindex=\"0\">Gå till bilen</a>.<br></p>",
		'passages': {
		},
	},
	'5.ninja_pyjamas_och_paraply': {
		'text': "<p>Mycket smart att ta med sig paraply! Mamma, pappa och ryan ångrar sig alla att dem inte tog ett paraply. Alla utom shawnie blir blöta.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"6.bilen\" role=\"link\" tabindex=\"0\">Gå till bilen</a>.<br></p>",
		'passages': {
		},
	},
	'5.kastrul': {
		'text': "<p>Aj aj aj, kastrullen ramlar av huvudet, och rakt ner i en mördarsnigel, som blir mosad och skvätter Ryan och Shawnie i ansikte när den explodera.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"6.bilen\" role=\"link\" tabindex=\"0\">Gå till bilen</a>.<br></p>",
		'passages': {
		},
	},
	'6.bilen': {
		'text': "<p>Bilen starta inte, och vem ska putta bilen till stationen?</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"6.bilen_mamma\" role=\"link\" tabindex=\"0\">Mamma</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"6.bilen_pappa\" role=\"link\" tabindex=\"0\">Pappa</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"6.bilen_ryan_och_shawn\" role=\"link\" tabindex=\"0\">Ryan och Shawn</a>.<br></p>",
		'passages': {
		},
	},
	'6.bilen_mamma': {
		'text': "<p>Pappa sätter sig i bilen, och killarna hejar på mamma. Men mamma får panik, när 1000 mördarsniglar kryper bredvid bilen. Hon glömmer att putta bilen, och börja döda sniglar istället. <a class=\"squiffy-link link-section\" data-section=\"6.bilen_ryan_och_shawn\" role=\"link\" tabindex=\"0\">Shawn och ryan måste ut och putta bilen istället.</a>.<br></p>",
		'passages': {
		},
	},
	'6.bilen_pappa': {
		'text': "<p>Ryan sätter sig i bilen och starta den när pappa puttar bilen. Han vet inte hur man bromsar, och kör rakt in i grannens hus, där grannen sitter och bajsar i toaletten som en stor nakenfis.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"7.station\" role=\"link\" tabindex=\"0\">Beställä taxi tills station</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"7.station\" role=\"link\" tabindex=\"0\">Katapultta barnen till station</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"7.station\" role=\"link\" tabindex=\"0\">Avatars flygande bison Appa ska tar killarna till stationen</a>.<br></p>",
		'passages': {
		},
	},
	'6.bilen_ryan_och_shawn': {
		'text': "<p>Shawn och ryan glömde äta grönsaker, och har inga krafter att putta bilen. Istället får <a class=\"squiffy-link link-section\" data-section=\"7.station\" role=\"link\" tabindex=\"0\">polisgrannen hjälpa oss att putta igång bilen.</a><br></p>",
		'passages': {
		},
	},
	'7.station': {
		'text': "<p>De delar ut sushi till alla barn som ska till skolan. Shawnie får ryans sushi också.</p>\n<p>Vilken sushi väljer ryan till shawnie.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"7.sushi\" role=\"link\" tabindex=\"0\">Lax nigiri</a><br>\n<a class=\"squiffy-link link-section\" data-section=\"7.sushi\" role=\"link\" tabindex=\"0\">Godis sushi med jordgubbar</a><br>\n<a class=\"squiffy-link link-section\" data-section=\"7.sushi\" role=\"link\" tabindex=\"0\">Levande bläckfisk sushi</a><br></p>",
		'passages': {
		},
	},
	'7.sushi': {
		'text': "<p>Mums! Mums! Shawnie tackar Ryan innan har <a class=\"squiffy-link link-section\" data-section=\"8.tåget\" role=\"link\" tabindex=\"0\">gå til tåget.</a><br></p>",
		'passages': {
		},
	},
	'8.tåget': {
		'text': "<p>Pappa och Shawn sitter i tåget. Pappa sover.... när ska Shawn stiger av?</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"8.alvik\" role=\"link\" tabindex=\"0\">T-centralen och alvik</a><br>\n<a class=\"squiffy-link link-section\" data-section=\"8.bajs_gatan\" role=\"link\" tabindex=\"0\">Odenplan och bajs-gatan</a><br>\n<a class=\"squiffy-link link-section\" data-section=\"8.fridhemsplan\" role=\"link\" tabindex=\"0\">T-centralen och fridhemsplan</a><br></p>",
		'passages': {
		},
	},
	'8.fridhemsplan': {
		'text': "<p>Grattis! Shawn och pappa är framme i Skolan! Alvin vinkar från skolgården. Har en bra skoldag Shawn!</p>",
		'passages': {
		},
	},
	'8.alvik': {
		'text': "<p>Oioi! Pappa och Shawn har missad skolan! Dem går till simmhallen istället?</p>",
		'passages': {
		},
	},
	'8.bajs_gatan': {
		'text': "<p>Oioi! Pappa och Shawn has missad skolan :( Och det stinker bajs från gatan. Dem måster åka hem och duscha. <b>This Guy Stinks!</b></p>",
		'passages': {
		},
	},
}
})();
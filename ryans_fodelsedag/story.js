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
squiffy.story.id = '00128cbf5e';
squiffy.story.sections = {
	'_default': {
		'text': "<p><h2>Ryans F??delsedag!</h2><br></p>\n<p><img src=\"https://cakerstreet1.s3.amazonaws.com/images/laser-tag-cake-16474-500-500.webp\"></p>\n<p>Snart fyller Shawns lillebror Ryan 7 ??r. Ryan ??r Shawnies b??sta v??n, och Shawn vill ge Ryans v??rldens b??sta och h??ftigaste present! Shawn funderar p?? att ge Ryan:</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"roblox_money\" role=\"link\" tabindex=\"0\">1000 roblox pengar</a>, eller kanske en <a class=\"squiffy-link link-section\" data-section=\"legendarisk_pokemon\" role=\"link\" tabindex=\"0\">legendarisk pokemon</a> och kanske ??nnu b??ttre ett <a class=\"squiffy-link link-section\" data-section=\"fylld_sushi\" role=\"link\" tabindex=\"0\">badkar fylld sushi</a>.</p>",
		'passages': {
		},
	},
	'fylld_sushi': {
		'text': "<p>-Pappa kan vi k??pa en miljon lax nigiri, och l??gga det i badkaret? <br>\n-??h, g?? och fr??ga mamma. <br>\nShawn g??r och fr??ga mamma som ??r helt upptagen med att klubba ihj??l m??rdarsniglar i tr??dg??rden. <br>\n-Mamma, f??r jag fr??ga dig en sak. Kan pappa k??pa <b>1 miljon</b> lax nigiri.<br>\n-Jaja, det g??r bra men vi m??ste k??pa en husbil f??rst, f??r hur ska vi kunna b??ra hem s?? mycket lax nigiri annars, svarade mamma.<br>\n??sch t??nker Shawnie, de fattar ju <b>ingenting</b>. Kanske l??ttare att l??na pappas kreditkort och k??pa 1000 <a class=\"squiffy-link link-section\" data-section=\"roblox_money\" role=\"link\" tabindex=\"0\">roblox pengar</a> sj??lv ist??llet.</p>",
		'passages': {
		},
	},
	'roblox_money': {
		'text': "<p>Shawn v??ntar tills pappa har somnat p?? soffan, d?? h??mtar han Ipaden, och l??nar pappas ansikte. Han tar ett kort p?? pappa och blir inloggad p?? Ipaden. Nu beh??ver han bara pappas tumme f??r att kunna klicka hem alla roblox-pengar. L??tt som en pl??tt. 1000 roblox pengar och kanske ocks?? en Bedwars <b>Cyber kit</b> as well. </p>\n<p><img src=\"https://tr.rbxcdn.com/8ba4624ac8861480ac11a41ece84b2d0/420/420/Image/Png\"></p>\n<p>Ryan ??r ju v??rldens b??sta lillebror. Pappa r??r p?? sig, shawnie klappar pappa p?? magen, s?? han kan sova lite till, och nu klickar han hem Bedwars! </p>\n<p>Hmmm! Tror att Ryan vill ocks?? har en <a class=\"squiffy-link link-section\" data-section=\"birthday_cake\" role=\"link\" tabindex=\"0\">f??delsedags t??rtan</a>, t??nker Shawn.</p>",
		'passages': {
		},
	},
	'legendarisk_pokemon': {
		'text': "<p>Shawnie ??lsklingspokemon ??r en k??mpar-pokemenon, <b>Marshadow</b>. </p>\n<p><img src=\"https://static.wixstatic.com/media/2e36a5_d0017de20aa246039f80dbc856af7fa4~mv2.jpg\"></p>\n<p>F??r att kunna f??nga en riktig pokemon, s?? m??ste man ha ett bete. Vad ska Shawnie f??nga pokemonen med?</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"legendarisk_pokemon_caugth\" role=\"link\" tabindex=\"0\">Ett paket linschips.</a><br>\n<a class=\"squiffy-link link-section\" data-section=\"legendarisk_pokemon_caugth\" role=\"link\" tabindex=\"0\">Kexchokklad med ketchup</a><br>\n<a class=\"squiffy-link link-section\" data-section=\"legendarisk_pokemon_caugth\" role=\"link\" tabindex=\"0\">Tre stycken gr??shoppar-huvuden.</a><br></p>",
		'passages': {
		},
	},
	'legendarisk_pokemon_caugth': {
		'text': "<p>Helt perfekt! </p>\n<p>Hmmm! Shawn tror att Ryan  ocks?? vill ha en <a class=\"squiffy-link link-section\" data-section=\"birthday_cake\" role=\"link\" tabindex=\"0\">f??delsedags t??rtan</a>, t??nker Shawn.</p>",
		'passages': {
		},
	},
	'birthday_cake': {
		'text': "<p>Shawnie google ett recept p?? slime-t??rta p?? youtube. Han blandar </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"birthday_cake_fail\" role=\"link\" tabindex=\"0\">honug, sm??r, salt och peppar</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"birthday_cake_fail\" role=\"link\" tabindex=\"0\">slem fr??n m??rdarsniglar, vetemj??l och sushi wasabi</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"birthday_cake_fail\" role=\"link\" tabindex=\"0\">ketchup, coca cola och br??d </a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"birthday_cake_success\" role=\"link\" tabindex=\"0\">tr??lim, tv??ttmedel och bakpulver</a>.<br></p>",
		'passages': {
		},
	},
	'birthday_cake_fail': {
		'text': "<p>Hj??lp mamma, mina h??nder har fastnat p?? bordet. Mamma kommer in och f?? panik, och skiker p?? Pappa s?? att alla p?? gatan h??r. Shawnie och pappa skrattar ??t mammas hysteri! Pappa tar bara lite vatten och Shawn ??r fri igen.\nBra f??rs??k! s??ger pappa. <a class=\"squiffy-link link-section\" data-section=\"birthday_cake\" role=\"link\" tabindex=\"0\">Prova igen!</a></p>",
		'passages': {
		},
	},
	'birthday_cake_success': {
		'text': "<p>Helt perefekt, nu l??gger han i lite gr??nt diskmedel, s?? det blir en stor boll med gr??nt slem. Han l??gger slemmet i en tallrik, och ovanp?? det l??gger han 7 st ljus. V??rldens coolaste t??rta, den ??r s??kert god, han f??r be ryan smakar. Nu kan <a class=\"squiffy-link link-section\" data-section=\"party\" role=\"link\" tabindex=\"0\">festen b??rja</a>!</p>",
		'passages': {
		},
	},
	'party': {
		'text': "<p>Shawn kl??r sig fint. Han s??tter p?? sih sina skidglas??gon, sin svarta mask, och svarta skelett pyjamas. Pappa s??tter p?? sig sin morgonrock. Mamma s??ger att b??da tv?? m??ste g?? och byta om till normala kl??der! Men mamma fattar ingenting! </p>\n<p>Ryan kommer in till rummet, och ??lskar slemt??rtan! Nu ??r det dags att <a class=\"squiffy-link link-section\" data-section=\"birthday_song\" role=\"link\" tabindex=\"0\">sjunga f??r Ryan</a>.</p>",
		'passages': {
		},
	},
	'birthday_song': {
		'text': "<p>Shawn har skivit en egen s??ng till dagens ??ra!</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"birthday_song1\" role=\"link\" tabindex=\"0\">S??ng Nummer 1</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"birthday_song2\" role=\"link\" tabindex=\"0\">S??ng Nummer 2</a>.<br>\n<a class=\"squiffy-link link-section\" data-section=\"birthday_song3\" role=\"link\" tabindex=\"0\">S??ng Nummer 3</a>.<br></p>",
		'passages': {
		},
	},
	'birthday_song1': {
		'text': "<ul>\n<li>Halleluja, halleluja, halva t??rta till lille Ryan\nHalleluja, halleluja, hela t??rta till stora Shawnie.</li>\n</ul>\n<p>Nu blev Ryan gn??llis! Sjung igen! <a class=\"squiffy-link link-section\" data-section=\"birthday_song\" role=\"link\" tabindex=\"0\">birthday_song</a>.<br></p>",
		'passages': {
		},
	},
	'birthday_song2': {
		'text': "<ul>\n<li>Imse vimse Ryan, fyller ??r igen. Store starke shawnie, vinner alla game!</li>\n</ul>\n<p>Nu blev Ryan gn??llis! Sjung igen! <a class=\"squiffy-link link-section\" data-section=\"birthday_song\" role=\"link\" tabindex=\"0\">birthday_song</a>.<br></p>",
		'passages': {
		},
	},
	'birthday_song3': {
		'text': "<ul>\n<li>Jag m??r han leva! - Jag m??r han leva!...</li>\n</ul>\n<p>Nu blev Ryan glad!</p>",
		'passages': {
		},
	},
}
})();
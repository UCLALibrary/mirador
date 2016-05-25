(function($)
{
	$.fn.hasClassRegEx = function(regex)
	{
		var classes = $(this).attr('class');

		if(!classes || !regex){ return false; }

		classes = classes.split(' ');
		var len = classes.length;

        var matches = [];
		for(var i=0; i<len; i++)
		{
			if(classes[i].match(regex)) {
                matches.push(classes[i]);
            }
		}

        if (matches.length > 0) {
            return matches;
        }
        else {
		    return false;
        }
	};
})(jQuery);

/*
<span id="hasClassRegEx" class="Test Testing someTest aaTestaa"></span>
     
$("#hasClassRegEx").hasClassRegEx();         // false
$("#hasClassRegEx").hasClassRegEx('');       // false
$("#hasClassRegEx").hasClassRegEx(/ /);      // false
$("#hasClassRegEx").hasClassRegEx(/test/);   // false

*/

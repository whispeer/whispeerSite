$('#rpassword').keyup(function(){

var password = jQuery(this).val();
var strength = 0;

// Adapted from http://www.codeproject.com/KB/scripting/passwordstrength.aspx
if (password.length > 4) strength++; // Greater than 4 chars long
if ( ( password.match(/[a-z]/) ) && ( password.match(/[A-Z]/) ) ) strength++; // Mix of upper and lower chars
if (password.match(/\d+/)) strength++; // Contains a number
if (password.match(/.[!,@,#,$,%,^,&,*,?,_,~,-,(,)]/) ) strength++; // Contains a special char
if (password.length > 10) strength++; // Longer than 10 chars

jQuery(this).parent().attr('data-strength', strength);

});
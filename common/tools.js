exports.escape_query = function(string) {
  return escape(string).replace(/\+/g, '%2b');
}

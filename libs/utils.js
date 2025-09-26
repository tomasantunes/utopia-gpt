function removeTags(str) { 
  if ((str===null) || (str==='')) 
      return false; 
  else
      str = str.toString(); 
  return str.replace( /(<([^>]+)>)/ig, '\n\n'); 
}

module.exports = {
    removeTags,
    default: {
        removeTags
    }
};
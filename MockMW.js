var mw = {
  loader: {
    getScript: (url) => {
      const newUrl = url
        .replace(
          'https://nookipedia.com/w/index.php?title=MediaWiki:Gadget-PasswordGenerator/',
          './'
        )
        .replace(/\&ctype\=.*\&action\=raw/gm, '');
      console.log('Loading script from:', newUrl);

      const dataType = newUrl.includes('.json') ? 'json' : 'script';

      return $.ajax(newUrl, { dataType, cache: !0 }).catch(function () {
        throw new Error('Failed to load script');
      });
    },
  },
};

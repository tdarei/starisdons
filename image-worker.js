self.addEventListener('message', function(e) {
  var paths = e.data || [];
  var tasks = paths.map(function(p) {
    return fetch(p, { method: 'HEAD' })
      .then(function(r) { return { path: p, ok: r.ok }; })
      .catch(function() { return { path: p, ok: false }; });
  });
  Promise.all(tasks).then(function(results) {
    self.postMessage(results);
  });
});

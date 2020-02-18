import os, re, shutil, gzip, zlib

class PublishError(Exception): pass

class Publisher:

  # Mathes template file {{filename}} markups
  re_template = re.compile('{{([^}]*)}}')

  @staticmethod
  def _ensureDir(path):
    path = os.path.dirname(path)
    if not os.path.exists(path):
      os.makedirs(path)

  @staticmethod
  def _findFiles(path):
    result = {}
    for dirname, dirnames, filenames in os.walk(path):
      # Exclude hidden files and directories.
      filenames = [ n for n in filenames if not n[0] == '.' ]
      dirnames[:] = [ n for n in dirnames if not n[0] == '.' ]
      for filename in filenames:
        filepath = os.path.join(dirname, filename)
        relpath = os.path.relpath(filepath, path)
        result[relpath] = ''
    return result

  @staticmethod
  def _hashed(fn, data):
    hsh = "-{:08x}".format(zlib.crc32(data) & 0xFFFFFFFF)
    spl = fn.split('.', 1)
    spl[0] += hsh
    return '.'.join(spl)

  def __init__(self, srcdir, dstdir, templates=[], replaces=[]):
    self.srcdir = os.path.join(os.path.normpath(srcdir), '')
    self.dstdir = os.path.join(os.path.normpath(dstdir), '')
    assert(self.srcdir != self.dstdir)

    self.templates = set(templates)
    self.replaces = replaces
    assert(self.templates.isdisjoint(set(self.replaces)))

    self.dry = False
    self.gzip = []
    self.keep_files = []
    self.keep_dirs = []

  def _checkForMissingRefs(self, refs):
    missing_refs = {}
    for fn,rfs in refs.items():
      missing = [ r for r in rfs if r not in self.files ]
      if missing:
        missing_refs[fn] = missing

    if missing_refs:
      msg = ["Invalid references in files:"]
      for fn,rfs in missing_refs.items():
        msg.append("{}: {}".format(fn, ', '.join(rfs)))
      raise PublishError(' '.join(msg))


  def publish(self):
    if self.dry:
      print 'Dry run! (Will not write/copy anything.)'

    self.files = Publisher._findFiles(self.srcdir)

    template_refs = dict((t, self._findTemplateRefs(t)) for t in self.templates)
    replace_refs = dict((r, self._findReplaceRefs(r, rl)) for r,rl in self.replaces.items())
    all_refs = template_refs.copy()
    all_refs.update(replace_refs)

    self._checkForMissingRefs(all_refs)

    order = [ f for f in self.files if not f in all_refs ]
    order_set = set(order)
    while all_refs:
      cyclic_ref = True
      for fn,refs in all_refs.items():
        if all(r in order_set for r in refs):
          order.append(fn)
          order_set.add(fn)
          del all_refs[fn]
          cyclic_ref = False
      if cyclic_ref:
        raise PublishError("Cyclic reference(s) in: " + ", ".join(all_refs))

    self._process(order)

  def _process(self, order):
    assert(set(order) == set(self.files))

    copy_map = {}

    def templateFilter(data):
      return Publisher.re_template.sub(lambda x: copy_map[x.group(1)], data)

    def replaceFilter(fn, data):
      for rfn in self.replaces[fn]:
        if rfn in copy_map:
          data = data.replace(rfn, copy_map[rfn])
      return data

    if self.dry:
      print 'Would write following:'

    keep_files = set(self.keep_files)
    keep_dirs = set(self.keep_dirs)

    for fn in order:
      srcfn = os.path.join(self.srcdir, fn)
      with open(srcfn, 'rb') as f:
        data = f.read()
        if fn in self.templates:
          data = templateFilter(data)
        elif fn in self.replaces:
          data = replaceFilter(fn, data)
        if fn in keep_files or os.path.dirname(fn) in keep_dirs:
          nfn = fn
        else:
          nfn = Publisher._hashed(fn, data)

        dstfn = os.path.join(self.dstdir, nfn)
        if self.dry:
          print '\t{} -> {}'.format(srcfn, dstfn)
        else:
          Publisher._ensureDir(dstfn)
          with open(dstfn, 'w') as df:
            df.write(data)

        copy_map[fn] = nfn

    # additionally gzip requested files
    if self.dry and self.gzip:
      print 'Would gzip following:'

    for fn in self.gzip:
      if fn not in copy_map:
        continue
      nfn = copy_map[fn]
      srcfn = os.path.join(self.dstdir, nfn)
      dstfn = srcfn + '.gz'
      if self.dry:
        print '\t{} -> {}'.format(srcfn, dstfn)
      else:
        with open(srcfn, 'rb') as fi, gzip.open(dstfn, 'wb') as fo:
          shutil.copyfileobj(fi, fo)

  def _findTemplateRefs(self, fn):
    try:
      with open(os.path.join(self.srcdir, fn), 'r') as f:
        tmp = f.read()
        refs = re.findall(Publisher.re_template, tmp)
        return set(refs)
    except IOError:
      raise PublishError("Cannot find file {}".format(fn))

  def _findReplaceRefs(self, fn, repl_list):
    try:
      with open(os.path.join(self.srcdir, fn), 'r') as f:
        tmp = f.read()
        refs = [ x for x in repl_list if x in tmp ]
        return set(refs)
    except IOError:
      raise PublishError("Cannot find file {}".format(fn))

#!/usr/bin/env python
import sys
from publisher import Publisher

if __name__ == '__main__':
  if len(sys.argv) < 3:
    print 'tool to generate a versioned site for em-fceux\n'
    print 'usage: build-site.py <srcdir> <dstdir>\n'
    print 'srcdir - source site tree w/ index.html, generated fceux.* javascript files etc.'
    print 'dstdir - directory to generate the versioned site'
    exit(1)

  templates = ['index.html', 'style.css', 'loader.js']
  replaces = {'fceux.js': ['fceux.wasm']}
  p = Publisher(sys.argv[1], sys.argv[2], templates, replaces)
  #p.dry = True
  p.keep_files = ['index.html']
  p.keep_dirs = ['games']
  p.gzip = ['fceux.js', 'fceux.wasm', 'input.js', 'loader.js', 'style.css']
  p.publish()

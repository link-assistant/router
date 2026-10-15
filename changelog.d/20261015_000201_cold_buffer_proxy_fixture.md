### Fixed

- Resolve the actual Buffer or Number constructor before installing the cold-import proxy fixture. Node can expose Buffer through an accessor descriptor; the control now installs a complete data descriptor and restores the exact original descriptor. Keep both original/current imports, zero-proxy-callback assertions, all eight whole-file cases and their original deadlines.

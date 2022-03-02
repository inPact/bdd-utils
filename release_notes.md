# 2.2.2
* entity resolver now replaces entity values in strings, rather than replacing the entire string along with the surrounding text
* missing fields are now correctly reported in the diff explanations
* regex values now support flags

# 2.2.1 (due to a publish error)
* added wait-for-async-activities function; fixed rows-hash in verify-table-includes-object to our custom rows-hash with arrays-support

# 2.1.0
* format: support parsing to local time with "[local]" notation

# 2.0.0
* abandon lodash-4; revert to lodash-4 and @tabit/utils@3.0.0

### 1.2.4
* lodash-4 migration: change 'capitalize' to 'upperFirst'

### 1.2.3
* fix @tabit/utils method invocations

### 1.2.2
* fix lodash-4 breaking-changes usages

### 1.2.1
* fix @tabit/utils reference

## 1.2.0
* 'verifySetIncludes' with 'saveLinks' option now saves links on context in 'savedLinks' property
* bdd-utils now includes default entity-resolver for resolving saved links using "link" or "LINK" resolver-headers,
e.g., \[link](A)._id
* migrated to lodash-4 
* migrate to new @tabit/utils
* migrate to @tabit/utils 'sumSafe' implementation instead of broken lodash-4 'sum'
* 'format': 'mergeHeadless' option no longer treats zeros as headless
* 'format': added 'excludeEmpty' option to ignore empty cells (rather than all "falsey" values)

# 1.1.0
* Utility functions and moredash now exported along with bdd-utils
* migrated entity-resolvers into bdd-utils

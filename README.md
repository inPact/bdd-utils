# bdd-utils
utility functions for working with cucumber-js

# Global
* * *
### objectsMatch(object, subset, formatSubset, context, matchNulls) 

Checks that @object includes @subset. Nulls in @subset must be null in @object. Fields in subset
with the value '**' are ignored.

**Parameters**

**object**: , Checks that @object includes @subset. Nulls in @subset must be null in @object. Fields in subset
with the value '**' are ignored.

**subset**: , Checks that @object includes @subset. Nulls in @subset must be null in @object. Fields in subset
with the value '**' are ignored.

**formatSubset**: , Checks that @object includes @subset. Nulls in @subset must be null in @object. Fields in subset
with the value '**' are ignored.

**context**: , Checks that @object includes @subset. Nulls in @subset must be null in @object. Fields in subset
with the value '**' are ignored.

**matchNulls**: , Checks that @object includes @subset. Nulls in @subset must be null in @object. Fields in subset
with the value '**' are ignored.

**Returns**: `boolean`


### verifyObjectIncludes() 

Supports path notations in keys (see lodash _.get)
Check for null with expected of "-"
Evaluate expression by surrounding it with double-curly braces, e.g., {{this.order._id}}
Verify against regex by passing in (escaped) regex syntax, e.g., /^\\d+$/



### verifySetIncludes(source, expectedSubSet, context, options) 

**Parameters**

**source**: 

**expectedSubSet**: 

**context**: 

**options**: `Object | String`, options object or error message to append when verification fails.

 - **options.matchNulls**: `Boolean`, true to verify that nulls in the expected set match nulls in the actual

 - **options.formatSubset**: `Boolean`

 - **options.strictOrder**: `Boolean`, if true, and the expectedSubSet is an array,
          the expectedSubSet must be in the same order as the source. default: false

 - **options.saveLinks**: `Boolean`, true to save and return elements with "link" fields, and delete the "link" field
before verifying.



### verifySetIncludesBy(source, expectedSubSet, matchFactory, context, message) 

Verifies that @source includes @expectedSubSet by using @matcher to match entries in @expectedSubSet
with elements in @source and, if a match is found, verifying that the matched entry (in @source) includes
the expected entry (in @expectedSubSet) by using the this.verifyObjectIncludes function.

**Parameters**

**source**: `Array`, the array of elements to test

**expectedSubSet**: `Array`, the array of elements against which to verify

**matchFactory**: `function`, a function that returns a lodash matcher to match elements in @source.
Invoked with one argument: the current entry from @expectedSubSet that should be matched against.

**context**: , Verifies that @source includes @expectedSubSet by using @matcher to match entries in @expectedSubSet
with elements in @source and, if a match is found, verifying that the matched entry (in @source) includes
the expected entry (in @expectedSubSet) by using the this.verifyObjectIncludes function.

**message**: , Verifies that @source includes @expectedSubSet by using @matcher to match entries in @expectedSubSet
with elements in @source and, if a match is found, verifying that the matched entry (in @source) includes
the expected entry (in @expectedSubSet) by using the this.verifyObjectIncludes function.



### verifySetMatchesTable(source, table, context, expectedCollectionName, validateCount, formatOptions, verifyOptions) 

Same as @verifySetIncludes except also verifies and handles table formatting

**Parameters**

**source**: , Same as @verifySetIncludes except also verifies and handles table formatting

**table**: , Same as @verifySetIncludes except also verifies and handles table formatting

**context**: , Same as @verifySetIncludes except also verifies and handles table formatting

**expectedCollectionName**: `String`, Same as @verifySetIncludes except also verifies and handles table formatting

**validateCount**: `Boolean`, Same as @verifySetIncludes except also verifies and handles table formatting

**formatOptions**: `Option`, Same as @verifySetIncludes except also verifies and handles table formatting

**verifyOptions**: `Option`, Same as @verifySetIncludes except also verifies and handles table formatting



### verifyObjectIncludesTable(source, table, context, expectedCollectionName) 

Same as verifyObjectIncludes except also verifies and handles table formatting

**Parameters**

**source**: , Same as verifyObjectIncludes except also verifies and handles table formatting

**table**: , Same as verifyObjectIncludes except also verifies and handles table formatting

**context**: , Same as verifyObjectIncludes except also verifies and handles table formatting

**expectedCollectionName**: , Same as verifyObjectIncludes except also verifies and handles table formatting



### verifySetDoesNotIncludeTable(source, table, context, expectedCollectionName) 

Same as @verifySetDoesNotInclude except also verifies and handles table formatting

**Parameters**

**source**: , Same as @verifySetDoesNotInclude except also verifies and handles table formatting

**table**: , Same as @verifySetDoesNotInclude except also verifies and handles table formatting

**context**: , Same as @verifySetDoesNotInclude except also verifies and handles table formatting

**expectedCollectionName**: , Same as @verifySetDoesNotInclude except also verifies and handles table formatting



### assertValueMatches() 

Supports path notations in keys (see lodash _.get)
Check for null with expected of "-"
Evaluate expression by surrounding it with double-curly braces, e.g., {{this.order._id}}
Verify against regex by passing in (escaped) regex syntax, e.g., /^\\d+$/
Checks for true/false if expected is "true" or "false"



### formatExpectedObject(expected, context) 

Deprecated: -- use "format" method

**Parameters**

**expected**: 

**context**: 

**Returns**: `Object`


### formatAndCamelCase(object, context, options) 

**Parameters**

**object**: 

**context**: 

**options**: 

 - **options.context**: , - the test context (world)

 - **options.parseAll**: 

 - **options.parseNumbers**: 

 - **options.parseDates**: 

 - **options.parseBooleans**: 

 - **options.parseJson**: 

 - **options.minusAsNull**: 

 - **options.parseCurrency**: 

 - **options.parseIntegerDates**: 

 - **options.numbersToCents**: 

 - **options.currencyToCents**: 

 - **options.plusAsExists**: 

 - **options.excludeMinuses**: 

 - **options.excludeFalsey**: 

 - **options.mergeHeadless**: 

**Returns**: `*`


### keysToCamelCase(object, options) 

Deprecated: - Use formatAndCamelCase instead

**Parameters**

**object**: 

**options**: , TODO

**Returns**: `*`


### stubMethod(context, target, targetName, methodName, response) 

**Parameters**

**context**: `World`, - the test context

**target**: `Object`, - the object whose method should be stubbed

**targetName**: `String`, - the target name for logging purposes

**methodName**: `String`, - the method to stub

**response**: `function | *`, - the response the stub should return or
a function who result the stub should return.

**Returns**: `*`


### buildPaths(object, options) 

Converts any path-style key-values into real nested key-values.
E.g., {"some.key": 99} will be converted to {some: {key: 99}}

**Parameters**

**object**: , Converts any path-style key-values into real nested key-values.
E.g., {"some.key": 99} will be converted to {some: {key: 99}}

**options**: , - readValue options

 - **options.parseJson**: , - parse JSON

 - **options.minusAsNull**: , - convert minus ("-") to null

**Returns**: `*`


### utcToLocalTimeInt() 

Used by dynamic resolvers, e.g., in features/business_day/move_business_day.feature
Do not modify/delete without validating consumers!



### rowsHash(table) 

Extract cucumbers' rowsHash(), but turn duplicates to array

**Parameters**

**table**: `cucumber.Table`, The table passed by cucumber to the step implementation



### hashes(table) 

Extract cucumbers' hashes(), but turn duplicates to array

**Parameters**

**table**: `cucumber.Table`, The table passed by cucumber to the step implementation




* * *











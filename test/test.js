var chai = require("chai")
var chaiHttp = require("chai-http")
const { faultyThingTD, perfectThingTD, testConfig } = require("./testing-payloads")
const { sleepInMs } = require("../dist/utilities.js")
const fs = require("fs")
chai.use(chaiHttp)
const address_testbench = "localhost:8980"
var expect = chai.expect

/**
 * Returns a TestCycle object from a TestResult object by int.
 * @param {JSON} testResult The JSON object containing the TestResults.
 * @param {number} cycleInt The number defining the TestCycle.
 * @returns {JSON} The JSON object containing the TestCycle.
 */
function getTestCycleByInt(testResult, cycleInt) {
    //console.log(testResult[cycleInt])
    return testResult[cycleInt]
}

/**
 * Returns a TestScenario object from a TestCycle object by int.
 * @param {JSON} testCycle The JSON object containing the TestCycle.
 * @param {number} scenarioInt The number defining the TestScenario.
 * @returns {JSON} The JSON object containing the TestScenario.
 */
function getTestScenarioByInt(testCycle, scenarioInt) {
    return testCycle[scenarioInt]
}

/**
 * Returns a TestCase object from a TestScenario object by int.
 * @param {JSON} testScenario The JSON object containing the TestScenario.
 * @param {JSON} testCaseInt The JSON object containing the TestCase.
 * @return {JSON} The JSON object containing the TestCase.
 */
function getTestCaseByInt(testScenario, testCaseInt) {
    return testScenario[testCaseInt]
}

/**
 * Returns an array with all Test Cases in the given TestResult JSON object.
 * @param {JSON} jsonTestResult The TestResult JSON.
 * @return {[JSON]} The array containing all testCase JSON objects.
 */
function getAllTestCases(jsonTestResult) {
    const allTestCases = []
    jsonTestResult.forEach((testCycle) => {
        testCycle.forEach((testScenario) => {
            //Could potentially be solved more elegant by using allTestCases.concat(testScenario), but
            //then legacy loops would have to be used.
            testScenario.forEach((testCase) => {
                allTestCases.push(testCase)
            })
        })
    })
    return allTestCases
}

function getPassedFailedArray(allTestCases) {
    const passedFailedArray = []
    allTestCases.forEach((testCase) => {
        passedFailedArray.push(testCase.passed)
    })
    return passedFailedArray
}

/**
 * Returns a TestCase JSON object from a TestScenario by name.
 * @param {JSON} testScenario The JSON object containing the TestScenario.
 * @param {string} testCaseName The string containing the TestCase name.
 * @returns {JSON | null} The JSON object containing the TestCase or null if name was not found.
 */
function getTestCaseByName(testScenario, testCaseName) {
    for (var i = 0; i < testScenario.length; ++i) {
        if (testScenario[i] == testCaseName) {
            return testScenario[i]
        }
        return null
    }
}

/**
 * Returns all TestCase JSON objects with the given name from the given Array of TestCase JSON object.
 * @param {[JSON]} testCases The array of JSON objects containing the TestCases to check.
 * @param {string} testCaseName The string containing the TestCase name.
 * @returns An arry containing all the TestCase JSON objects with the given name. Array is empty
 * if no TestCase with the given name has been found.
 */
function getAllTestCasesWithName(testCases, testCaseName) {
    let AllTestCasesWithName = []
    testCaseName.forEach((testCase) => {
        if (testCase.name == testCaseName) {
            AllTestCasesWithName.push(testCase)
        }
    })
    return AllTestCasesWithName
}

/**
 * Returns true if all TestCases in the given array passed. Returns false otherwise.
 * @param {[JSON]} allTestCases The array containing all the TestCase JSON objects.
 * @returns {boolean} Returns true if all Tests passed. Returns false otherwise.
 */
function allTestPassed(allTestCases) {
    //If Array does not contain passed == false every test passed.
    return !allTestCases.some((testCase) => testCase.passed == false)
}

/**
 * Tests the fastTest action:
 * - The testbench is sent a TD for both faultyThing and perfectThing.
 * - The test cases are extracted from the output.
 * - From this output it is checked if the correct test cases failed, respectively passed.
 * !!! REPEATED execution might fail if faultyThing is not restarted for each execution.
 */
describe("Action: fastTest", function () {
    describe("Test faultyThing", function () {
        it("Fast Test", function (done) {
            this.timeout(20000)

            // Setting the test config.
            chai.request(address_testbench)
                .put("/wot-test-bench/properties/testConfig")
                .send(testConfig)
                .then(async () => {
                    // Making sure the test config is used for the test run.
                    await sleepInMs(1000)
                })

            // Send some Form Data
            chai.request(address_testbench)
                .post("/wot-test-bench/actions/fastTest")
                .send(faultyThingTD)
                .end(function (err, res) {
                    let allTestCases = getAllTestCases(res.body)
                    expect(allTestCases.length, "Did not report the correct amount of Testcases.").to.be.equal(28) //Check if all TestCases have been generated.

                    // Expected failed/passed sequence.
                    expectedArray = [true, false, false, false, true, false, false, true, false, false, true, false, false, false]
                    // Testing the first test scenario.
                    expect(getPassedFailedArray(res.body[0][0]), "First test sequence not as expected").is.eql(expectedArray)
                    // Testing the second test scenario.
                    expect(getPassedFailedArray(res.body[0][1]), "Second test sequence not as expected").is.eql(expectedArray)

                    expect(err).to.be.null
                    done()
                })
        })
    })

    describe("Test perfectThing", function () {
        it("Fast Test", function (done) {
            this.timeout(10000)

            // Setting the default config.
            chai.request(address_testbench)
                .put("/wot-test-bench/properties/testConfig")
                .send(JSON.parse(fs.readFileSync("./default-config.json", "utf8")))
                .then(async () => {
                    // Making sure the default config is used for the test run.
                    await sleepInMs(1000)
                })
            // Send some Form Data
            chai.request(address_testbench)
                .post("/wot-test-bench/actions/fastTest")
                .send(perfectThingTD)
                .end(function (err, res) {
                    let allTestCases = getAllTestCases(res.body)
                    //console.log(allTestCases); //Can be used to log TestResults for debugging purposes.
                    expect(allTestCases.length, "Did not report the correct amount of Testcases.").to.be.equal(24) //Check if all TestCases have been generated.
                    expect(allTestPassed(allTestCases, "Not all Testcases passed for Action: fastTest.")).to.be.true //Check if all TestCases have passed.
                    expect(err).to.be.null
                    done()
                })
        })
    })
})

// Constant used to define that something is not the actual data (Not ideal, but every other value would also be possible, even null).
const notTheActualData = "Not the actual data"

/**
 * Checks if an array fulfills the provided parameters.
 * @param {*} dataArray The data array to check.
 * @param {*} length The length of the data array to check.
 * @param {*} dataType The type of the elements of the array to check.
 * @param {*} actualData The actual data value of all array elements
 */
function checkDataArray(dataArray, length, dataType, actualData = notTheActualData, isArray = false) {
    expect(dataArray.length).to.be.equal(length)
    dataArray.forEach((data) => {
        expect(typeof data === dataType, "Expected data type: " + dataType + "; Got: " + typeof data).to.be.true
        if (actualData != notTheActualData) {
            expect(data == actualData).to.be.true
        }
        if (isArray) {
            expect(Array.isArray(data), "Object was not an array: " + data).to.be.true
        }
    })
}

/**
 * Checks if the generation of test data works as defined. This test has to be executed after the test for action fastTest, otherwise no
 * data is generated, thus the property would be null.
 */
describe("Property: testData", function () {
    describe("Get test Data", function () {
        it("Get Data", function (done) {
            // Send some Form Data
            chai.request(address_testbench)
                .get("/wot-test-bench/properties/testData")
                .end(function (err, res) {
                    expect(err).to.be.null
                    expect(res).to.have.status(200)
                    // Check properties
                    checkDataArray(res.body.Property.display, 2, "string")
                    checkDataArray(res.body.Property.counter, 2, "number")
                    checkDataArray(res.body.Property.temperature, 2, "object", null)
                    checkDataArray(res.body.Property.testObject, 2, "object")
                    checkDataArray(res.body.Property.testArray, 2, "object", notTheActualData, true)
                    // Check actions
                    checkDataArray(res.body.Action.setCounter, 2, "number")
                    checkDataArray(res.body.Action.getTemperature, 2, "object", null)
                    checkDataArray(res.body.Action.setDisplay, 2, "string")
                    checkDataArray(res.body.Action.setTestObject, 2, "object")
                    checkDataArray(res.body.Action.setTestArray, 2, "object", notTheActualData, true)
                    // Check events
                    checkDataArray(res.body.EventSubscription.onChange, 2, "object", null)
                    checkDataArray(res.body.EventSubscription.onChangeTimeout, 2, "object", null)
                    checkDataArray(res.body.EventCancellation.onChange, 2, "object", null)
                    checkDataArray(res.body.EventCancellation.onChangeTimeout, 2, "object", null)
                    done()
                })
        })
    })
})

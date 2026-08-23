import { test } from "node:test";
import assert from "node:assert/strict";
import {
  treeBranchStatus,
  MAX_TREE_DEVICES_PER_BRANCH,
  MAX_TREE_CABLE_LENGTH_M,
} from "./tree.ts";

test("treeBranchStatus is green well under both limits", () => {
  assert.equal(treeBranchStatus(10, 50), "green");
});

test("treeBranchStatus turns yellow at 80% of the device limit", () => {
  assert.equal(treeBranchStatus(Math.ceil(MAX_TREE_DEVICES_PER_BRANCH * 0.8), 0), "yellow");
});

test("treeBranchStatus turns yellow at 80% of the cable-length limit", () => {
  assert.equal(treeBranchStatus(0, MAX_TREE_CABLE_LENGTH_M * 0.8), "yellow");
});

test("treeBranchStatus turns red at the device limit", () => {
  assert.equal(treeBranchStatus(MAX_TREE_DEVICES_PER_BRANCH, 0), "red");
});

test("treeBranchStatus turns red past the device limit", () => {
  assert.equal(treeBranchStatus(MAX_TREE_DEVICES_PER_BRANCH + 1, 0), "red");
});

test("treeBranchStatus turns red at the cable-length limit", () => {
  assert.equal(treeBranchStatus(0, MAX_TREE_CABLE_LENGTH_M), "red");
});

test("treeBranchStatus is red if either limit alone is exceeded", () => {
  assert.equal(treeBranchStatus(MAX_TREE_DEVICES_PER_BRANCH + 5, 10), "red");
  assert.equal(treeBranchStatus(1, MAX_TREE_CABLE_LENGTH_M + 50), "red");
});

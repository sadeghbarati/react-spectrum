/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {act, pointerMap, render, screen, simulateDesktop, simulateMobile, waitFor, waitForElementToBeRemoved, within} from '@react-spectrum/test-utils';
import {Button, Label, ListBox, Popover, Item as RACItem, Select, SelectValue, Text} from 'react-aria-components';
import {Item, Picker} from '../src';
import {Provider} from '@react-spectrum/provider';
import React from 'react';
import {SelectTester} from '@react-aria/test-utils';
import {theme} from '@react-spectrum/theme-default';
import userEvent from '@testing-library/user-event';

// TODO: replace all of these exported utils
describe('Picker/Select ', function () {
  let offsetWidth, offsetHeight;
  let onSelectionChange = jest.fn();
  let onOpenChange = jest.fn();
  let user;

  beforeAll(function () {
    offsetWidth = jest.spyOn(window.HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 1000);
    offsetHeight = jest.spyOn(window.HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => 1000);
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    simulateDesktop();
    user = userEvent.setup({delay: null, pointerMap});
  });

  afterAll(function () {
    offsetWidth.mockReset();
    offsetHeight.mockReset();
  });

  describe('with real timers', function () {
    beforeAll(function () {
      jest.useRealTimers();
    });

    afterEach(function () {
      jest.clearAllMocks();
    });

    it('basic flow without test util helpers', async function () {
      let {getAllByText, getByText, getByRole, findByRole, queryByRole} = render(
        <Provider theme={theme}>
          <Picker label="Test" data-testid="test" onSelectionChange={onSelectionChange} onOpenChange={onOpenChange}>
            <Item key="one">One</Item>
            <Item key="two">Two</Item>
            <Item key="three">Three</Item>
          </Picker>
        </Provider>
      );

      let select = getByRole('textbox', {hidden: true});
      expect(select).not.toBeDisabled();

      let picker = getByRole('button');
      expect(picker).toHaveAttribute('aria-haspopup', 'listbox');
      expect(picker).toHaveAttribute('data-testid', 'test');

      let label = getAllByText('Test')[0];
      let value = getByText('Select an option…');
      expect(label).toBeVisible();
      expect(value).toBeVisible();

      // // Note: userEvent properly fires a event that is detected as a mouse click by isVirtualClick in usePress
      // userEvent.click(picker);
      await user.click(picker);

      let listbox = await findByRole('listbox');
      expect(listbox).toBeVisible();
      expect(onOpenChange).toBeCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(picker).toHaveAttribute('aria-expanded', 'true');
      expect(picker).toHaveAttribute('aria-controls', listbox.id);

      let items = within(listbox).getAllByRole('option');
      expect(items.length).toBe(3);
      expect(items[0]).toHaveTextContent('One');
      expect(items[1]).toHaveTextContent('Two');
      expect(items[2]).toHaveTextContent('Three');
      expect(document.activeElement).toBe(listbox);

      // userEvent.click(items[2]);
      await user.click(items[2])

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenLastCalledWith('three');
      await waitForElementToBeRemoved(() => queryByRole('listbox'));
      await waitFor(() => {
        expect(document.activeElement).toBe(picker);
      }, {interval: 10});

      expect(picker).toHaveTextContent('Three');
    });

    it('basic flow with SelectTester', async function () {
      render(
        <Provider theme={theme}>
          <div role="listbox">blah</div>
          <Picker label="Test" data-testid="test" onSelectionChange={onSelectionChange} onOpenChange={onOpenChange}>
            <Item key="one">One</Item>
            <Item key="two">Two</Item>
            <Item key="three">Three</Item>
          </Picker>
        </Provider>
      );

      let picker = new SelectTester({user, element: screen.getByTestId('test'), timerType: 'real'});
      await picker.selectOption('Three');
      expect(picker.trigger).toHaveTextContent('Three');
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenLastCalledWith('three');
    });

    it('works with RAC Select', async function () {
      render(
        <Select data-testid="test" onSelectionChange={onSelectionChange}>
          <Label>Favorite Animal</Label>
          <Button>
            <SelectValue />
          </Button>
          <Text slot="description">Description</Text>
          <Text slot="errorMessage">Error</Text>
          <Popover>
            <ListBox>
              <RACItem id="cat">Cat</RACItem>
              <RACItem id="dog">Dog</RACItem>
              <RACItem id="kangaroo">Kangaroo</RACItem>
            </ListBox>
          </Popover>
        </Select>
      );

      // TODO: update RAC select so data-testid doesn't propagate to the button
      let picker = new SelectTester({user, element: screen.getAllByTestId('test')[0], timerType: 'real'});
      await picker.selectOption('Cat');
      expect(picker.trigger).toHaveTextContent('Cat');
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenLastCalledWith('cat');
    });
  });

  describe('with fake timers', function () {
    beforeAll(function () {
      jest.useFakeTimers();
    });

    afterEach(function () {
      act(() => jest.runAllTimers());
      jest.clearAllMocks();
    });

    it('basic flow without test util helpers', async function () {
      let {getAllByText, getByText, getByRole} = render(
        <Provider theme={theme}>
          <Picker label="Test" data-testid="test" onSelectionChange={onSelectionChange} onOpenChange={onOpenChange}>
            <Item key="one">One</Item>
            <Item key="two">Two</Item>
            <Item key="three">Three</Item>
          </Picker>
        </Provider>
      );

      let select = getByRole('textbox', {hidden: true});
      expect(select).not.toBeDisabled();

      let picker = getByRole('button');
      expect(picker).toHaveAttribute('aria-haspopup', 'listbox');
      expect(picker).toHaveAttribute('data-testid', 'test');

      let label = getAllByText('Test')[0];
      let value = getByText('Select an option…');
      expect(label).toBeVisible();
      expect(value).toBeVisible();

      await user.click(picker);
      act(() => jest.runAllTimers());

      let listbox = getByRole('listbox');
      expect(listbox).toBeVisible();
      expect(onOpenChange).toBeCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(picker).toHaveAttribute('aria-expanded', 'true');
      expect(picker).toHaveAttribute('aria-controls', listbox.id);

      let items = within(listbox).getAllByRole('option');
      expect(items.length).toBe(3);
      expect(items[0]).toHaveTextContent('One');
      expect(items[1]).toHaveTextContent('Two');
      expect(items[2]).toHaveTextContent('Three');
      expect(document.activeElement).toBe(listbox);

      await user.click(items[2]);

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenLastCalledWith('three');
      act(() => jest.runAllTimers());
      expect(listbox).not.toBeInTheDocument();

      // run restore focus rAF
      act(() => jest.runAllTimers());
      expect(document.activeElement).toBe(picker);
      expect(picker).toHaveTextContent('Three');
    });

    it('basic flow with SelectTester', async function () {
      render(
        <Provider theme={theme}>
          <Picker label="Test" data-testid="test" onSelectionChange={onSelectionChange} onOpenChange={onOpenChange}>
            <Item key="one">One</Item>
            <Item key="two">Two</Item>
            <Item key="three">Three</Item>
          </Picker>
        </Provider>
      );

      let picker = new SelectTester({user, element: screen.getByTestId('test')});
      await picker.selectOption('Three');
      expect(picker.trigger).toHaveTextContent('Three');
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenLastCalledWith('three');
    });

    it('works with RAC Select', async function () {
      render(
        <Select data-testid="test" onSelectionChange={onSelectionChange}>
          <Label>Favorite Animal</Label>
          <Button>
            <SelectValue />
          </Button>
          <Text slot="description">Description</Text>
          <Text slot="errorMessage">Error</Text>
          <Popover>
            <ListBox>
              <RACItem id="cat">Cat</RACItem>
              <RACItem id="dog">Dog</RACItem>
              <RACItem id="kangaroo">Kangaroo</RACItem>
            </ListBox>
          </Popover>
        </Select>
      );

      let picker = new SelectTester({user, element: screen.getAllByTestId('test')[0]});
      await picker.selectOption('Cat');
      expect(picker.trigger).toHaveTextContent('Cat');
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenLastCalledWith('cat');
    });
  });

  describe('test simulateMobile', function () {
    beforeAll(function () {
      simulateMobile();
      jest.useRealTimers();
    });

    it('check for tray', async function () {
      render(
        <Provider theme={theme}>
          <div role="listbox">blah</div>
          <Picker label="Test" data-testid="test" onSelectionChange={onSelectionChange} onOpenChange={onOpenChange}>
            <Item key="one">One</Item>
            <Item key="two">Two</Item>
            <Item key="three">Three</Item>
          </Picker>
        </Provider>
      );

      let picker = new SelectTester({user, element: screen.getByTestId('test'), timerType: 'real'});
      await picker.open();
      expect(await screen.findByTestId('tray')).toContainElement(picker.listbox);
    });
  });
});
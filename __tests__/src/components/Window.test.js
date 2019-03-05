import React from 'react';
import { shallow } from 'enzyme';
import { Window } from '../../../src/components/Window';
import WindowTopBar from '../../../src/containers/WindowTopBar';
import PrimaryWindow from '../../../src/containers/PrimaryWindow';
import ThumbnailNavigation from '../../../src/containers/ThumbnailNavigation';

/** create wrapper */
function createWrapper(props, context) {
  return shallow(
    <Window
      window={window}
      classes={{}}
      {...props}
    />,
    { context },
  );
}

describe('Window', () => {
  let wrapper;
  const window = {
    id: 123,
    x: 2700,
    y: 2700,
    width: 400,
    height: 400,
  };
  it('should render nothing, if provided with no window data', () => {
    wrapper = shallow(<Window />);
    expect(wrapper.find('.mirador-window')).toHaveLength(0);
  });
  it('should render outer element', () => {
    wrapper = createWrapper({ window });
    expect(wrapper.find('.mirador-window')).toHaveLength(1);
  });
  it('should render <WindowTopBar>', () => {
    wrapper = createWrapper({ window });
    expect(wrapper.find(WindowTopBar)).toHaveLength(1);
  });
  it('should render <PrimaryWindow>', () => {
    wrapper = createWrapper({ window });
    expect(wrapper.find(PrimaryWindow)).toHaveLength(1);
  });
  it('should render <ThumbnailNavigation>', () => {
    wrapper = createWrapper({ window });
    expect(wrapper.find(ThumbnailNavigation)).toHaveLength(1);
  });
  it('should render bottom companions window areas', () => {
    wrapper = createWrapper({ window });
    expect(wrapper.find('.mirador-companion-bottom')).toHaveLength(1);
  });
  describe('when workspaceType is mosaic', () => {
    it('calls the context mosaicWindowActions connectDragSource method to make WindowTopBar draggable', () => {
      const connectDragSource = jest.fn(component => component);
      wrapper = createWrapper({ window, workspaceType: 'mosaic' }, { mosaicWindowActions: { connectDragSource } });
      expect(wrapper.find(WindowTopBar)).toHaveLength(1);
      expect(connectDragSource).toHaveBeenCalled();
    });
  });
});

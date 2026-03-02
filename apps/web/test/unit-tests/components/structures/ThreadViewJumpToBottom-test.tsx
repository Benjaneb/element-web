/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { render, waitFor } from "jest-matrix-react";
import userEvent from "@testing-library/user-event";
import { mocked } from "jest-mock";
import {
    PendingEventOrdering,
    type MatrixClient,
    Room,
    type MatrixEvent,
} from "matrix-js-sdk/src/matrix";
import React from "react";

import ThreadView from "../../../../src/components/structures/ThreadView";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import ResizeNotifier from "../../../../src/utils/ResizeNotifier";
import { mockPlatformPeg } from "../../../test-utils/platform";
import { getRoomContext } from "../../../test-utils/room";
import { stubClient } from "../../../test-utils/test-utils";
import { mkThread } from "../../../test-utils/threads";
import { ScopedRoomContextProvider } from "../../../../src/contexts/ScopedRoomContext.tsx";

const mockTimelinePanelRefApi = {
    isAtEndOfLiveTimeline: jest.fn(),
    jumpToLiveTimeline: jest.fn(),
    refreshTimeline: jest.fn(),
    scrollToEventIfNeeded: jest.fn(),
};

jest.mock("../../../../src/components/structures/TimelinePanel", () => {
    const react = jest.requireActual("react");

    class MockTimelinePanel extends react.Component {
        public isAtEndOfLiveTimeline = (): boolean | undefined => mockTimelinePanelRefApi.isAtEndOfLiveTimeline();
        public jumpToLiveTimeline = (): void => mockTimelinePanelRefApi.jumpToLiveTimeline();
        public refreshTimeline = (): void => mockTimelinePanelRefApi.refreshTimeline();
        public scrollToEventIfNeeded = (): void => mockTimelinePanelRefApi.scrollToEventIfNeeded();

        public render(): React.ReactNode {
            return react.createElement("div");
        }
    }

    return {
        __esModule: true,
        default: MockTimelinePanel,
    };
});

describe("ThreadView jump to bottom", () => {
    const ROOM_ID = "!roomId:example.org";
    let mockClient: MatrixClient;
    let room: Room;
    let rootEvent: MatrixEvent;

    beforeEach(() => {
        jest.clearAllMocks();

        stubClient();
        mockPlatformPeg();
        mockClient = mocked(MatrixClientPeg.safeGet());
        jest.spyOn(mockClient, "supportsThreads").mockReturnValue(true);

        room = new Room(ROOM_ID, mockClient, mockClient.getUserId() ?? "", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        rootEvent = mkThread({
            room,
            client: mockClient,
            authorId: mockClient.getUserId()!,
            participantUserIds: [mockClient.getUserId()!],
        }).rootEvent;

        mockTimelinePanelRefApi.isAtEndOfLiveTimeline.mockReturnValue(false);
    });

    it("shows jump button when thread is not at bottom and jumps on click", async () => {
        const { container } = render(
            <MatrixClientContext.Provider value={mockClient}>
                <ScopedRoomContextProvider
                    {...getRoomContext(room, {
                        canSendMessages: true,
                    })}
                >
                    <ThreadView
                        room={room}
                        onClose={jest.fn()}
                        mxEvent={rootEvent}
                        resizeNotifier={new ResizeNotifier()}
                    />
                </ScopedRoomContextProvider>
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(container.querySelector(".mx_JumpToBottomButton")).toBeTruthy());
        await userEvent.click(container.querySelector(".mx_JumpToBottomButton_scrollDown") as HTMLElement);

        expect(mockTimelinePanelRefApi.jumpToLiveTimeline).toHaveBeenCalledTimes(1);
    });
});

import React, { useCallback, useContext } from "react";
import { Snackbar } from "@amplication/design-system";
import * as models from "../models";
import { gql, useMutation } from "@apollo/client";
import { formatError } from "../util/error";
import { GET_PENDING_CHANGES } from "./PendingChanges";
import { Button, EnumButtonStyle } from "../Components/Button";
import "./DiscardChanges.scss";
import { AppContext } from "../context/appContext";

type Props = {
  resourceId: string;
  onComplete: () => void;
  onCancel: () => void;
};

const CLASS_NAME = "discard-changes";

const DiscardChanges = ({ resourceId, onComplete, onCancel }: Props) => {
  const { pendingChanges, resetPendingChanges } = useContext(AppContext);
  const [discardChanges, { error, loading }] = useMutation(DISCARD_CHANGES, {
    update(cache, { data }) {
      if (!data) return;

      //remove entities from cache to reflect discarded changes
      for (var change of pendingChanges) {
        if (
          change.originType === models.EnumPendingChangeOriginType.Entity
        ) {
          cache.evict({
            id: cache.identify({
              id: change.originId,
              __typename: "Entity",
            }),
          });
        } else {
          /**@todo: handle other types of blocks */
          cache.evict({
            id: cache.identify({
              id: change.originId,
              __typename: "ServiceSettings",
            }),
          });
        }
      }
    },
    onCompleted: (data) => {
      resetPendingChanges();
      onComplete();
    },
    refetchQueries: [
      {
        query: GET_PENDING_CHANGES,
        variables: {
          resourceId: resourceId,
        },
      },
    ],
  });

  const handleConfirm = useCallback(() => {
    discardChanges({
      variables: {
        resourceId: resourceId,
      },
    }).catch(console.error);
  }, [resourceId, discardChanges]);

  const errorMessage = formatError(error);

  return (
    <div className={CLASS_NAME}>
      <div className={`${CLASS_NAME}__content`}>
        <div>
          <div className={`${CLASS_NAME}__content__title`}>Please Notice</div>
          <div className={`${CLASS_NAME}__content__instructions`}>
            This action cannot be undone.
            <br /> Are you sure you want to discard all pending changes?
          </div>
        </div>
      </div>
      <div className={`${CLASS_NAME}__buttons`}>
        <div className="spacer" />
        <Button buttonStyle={EnumButtonStyle.Text} onClick={onCancel}>
          Cancel
        </Button>

        <Button
          buttonStyle={EnumButtonStyle.Primary}
          eventData={{
            eventName: "discardPendingChanges",
          }}
          onClick={handleConfirm}
          disabled={loading}
        >
          Discard Changes
        </Button>
      </div>

      <Snackbar open={Boolean(error)} message={errorMessage} />
    </div>
  );
};

export default DiscardChanges;

const DISCARD_CHANGES = gql`
  mutation discardChanges($resourceId: String!) {
    discardPendingChanges(data: { resource: { connect: { id: $resourceId } } })
  }
`;

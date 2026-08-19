import { formatDistanceToNow } from 'date-fns';

export default function ActivityItem({ item = {}, onOpen = () => {} }) {
  const when = item.at ? formatDistanceToNow(new Date(item.at), { addSuffix: true }) : '';
  let title = '';
  switch (item.type) {
    case 'friend_request':
      title = 'New friend request';
      break;
    case 'mention':
      title = `${item.actorName || 'Someone'} mentioned you${item.groupName ? ` in ${item.groupName}` : ''}`;
      break;
    case 'reaction':
      title = item.emoji ? `Reaction ${item.emoji}` : 'Message reaction';
      break;
    case 'group':
      title = `${item.action ? item.action[0].toUpperCase() + item.action.slice(1) : 'Updated'} group${item.groupName ? ` ${item.groupName}` : ''}`;
      break;
    default:
      title = item.type || 'Activity';
  }

  return (
    <div className="activity-item" onClick={onOpen} role="button" tabIndex={0}>
      <div className="activity-item-main">
        <div className="activity-item-title">{title}</div>
        <div className="activity-item-meta muted">{when}</div>
      </div>
    </div>
  );
}

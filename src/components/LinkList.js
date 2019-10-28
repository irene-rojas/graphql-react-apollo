import React, { Component } from 'react'
import Link from './Link'
import gql from 'graphql-tag'
import { Query } from 'react-apollo'

export const FEED_QUERY = gql`
  query FeedQuery($first: Int, $skip: Int, $orderBy: LinkOrderByInput) {
    feed(first: $first, skip: $skip, orderBy: $orderBy) {
      links {
        id
        createdAt
        url
        description
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      count
    }
  }
`


const NEW_LINKS_SUBSCRIPTION = gql`
  subscription {
    newLink {
      id
      url
      description
      createdAt
      postedBy {
        id
        name
      }
      votes {
        id
        user {
          id
        }
      }
    }
  }
`

const NEW_VOTES_SUBSCRIPTION = gql`
  subscription {
    newVote {
      id
      link {
        id
        url
        description
        createdAt
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      user {
        id
      }
    }
  }
`


class LinkList extends Component {
    _updateCacheAfterVote = (store, createVote, linkId) => {
      const data = store.readQuery({ query: FEED_QUERY })
    
      const votedLink = data.feed.links.find(link => link.id === linkId)
      votedLink.votes = createVote.link.votes
    
      store.writeQuery({ query: FEED_QUERY, data })
    }

    _subscribeToNewLinks = subscribeToMore => {
      subscribeToMore({
        document: NEW_LINKS_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev
          const newLink = subscriptionData.data.newLink
          const exists = prev.feed.links.find(({ id }) => id === newLink.id);
          if (exists) return prev;
    
          return Object.assign({}, prev, {
            feed: {
              links: [newLink, ...prev.feed.links],
              count: prev.feed.links.length + 1,
              __typename: prev.feed.__typename
            }
          })
        }
      })
    }
    
    _subscribeToNewVotes = subscribeToMore => {
      subscribeToMore({
        document: NEW_VOTES_SUBSCRIPTION
      })
    }

    _getQueryVariables = () => {
      const isNewPage = this.props.location.pathname.includes('new')
      const page = parseInt(this.props.match.params.page, 10)
    
      const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
      const first = isNewPage ? LINKS_PER_PAGE : 100
      const orderBy = isNewPage ? 'createdAt_DESC' : null
      return { first, skip, orderBy }
    }
        
  
    render() {
      return (
        <Query query={FEED_QUERY}>
          {({ loading, error, data, subscribeToMore }) => {
            if (loading) return <div>Fetching</div>
            if (error) return <div>Error</div>
            
            this._subscribeToNewLinks(subscribeToMore)
            this._subscribeToNewVotes(subscribeToMore)

            const linksToRender = data.feed.links
      
            return (
              <div>
                {linksToRender.map((link, index) => (
                  <Link 
                    key={link.id} 
                    link={link} 
                    index={index}
                    updateStoreAfterVote={this._updateCacheAfterVote} />
                ))}
              </div>
            )
          }}
        </Query>
      )
    }
  }
  

export default LinkList